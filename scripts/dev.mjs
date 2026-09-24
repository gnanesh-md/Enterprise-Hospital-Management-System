// Dev launcher: `npm run dev` runs the HMS app on $PORT (default 8443) and
// makes sure the embedded Keppler OCR frontend is up on port 3000 alongside it.
//
// vite.config.ts reverse-proxies /keppler-ocr and /api to port 3000, so if that
// server isn't running every one of those requests is a 502 Bad Gateway and the
// OCR / summarizer / RAG features come up blank.
//
// Keppler is deliberately NOT tied to this process's lifetime: it is started
// detached and left running when the HMS server stops, so restarting the main
// app doesn't restart Keppler too. A second `npm run dev` just reuses it.
// Stop it explicitly with `npm run dev:stop`.

import { spawn, execSync } from "node:child_process"
import { existsSync, openSync } from "node:fs"
import net from "node:net"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OCR_DIR = path.join(ROOT, "dpi-ocr-frontend")
const OCR_PORT = 3000
const OCR_LOG = path.join(ROOT, "keppler-ocr.log")
const HMS_PORT = parseInt(process.env.PORT || "8443", 10)

const isWin = process.platform === "win32"

// Spawn vite directly rather than via npx: `npm exec` wraps it in an extra
// `sh -c` layer, so a kill on the child hits the wrapper and leaves vite itself
// orphaned holding the port.
const viteBin = (dir) => {
  const binName = isWin ? "vite.cmd" : "vite"
  const local = path.join(dir, "node_modules", ".bin", binName)
  return existsSync(local)
    ? { cmd: local, args: [], shell: isWin }
    : { cmd: isWin ? "npx.cmd" : "npx", args: ["vite"], shell: isWin }
}

const portInUse = (port) =>
  new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port })
    socket.setTimeout(1000)
    socket.on("connect", () => (socket.destroy(), resolve(true)))
    socket.on("timeout", () => (socket.destroy(), resolve(false)))
    socket.on("error", () => resolve(false))
  })

const log = (name, msg) => console.log(`[${name}] ${msg}`)

// Vite dev-transforms every module on first request, so the very first page
// load after a cold start costs seconds while later ones are ~0.5s. Pull the
// entry once in the background so that cost is paid before anyone clicks the
// Keppler OCR tab.
async function warmUp(port, urlPath, attempts = 20) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, {
        signal: AbortSignal.timeout(30_000),
      })
      await res.arrayBuffer()
      log("keppler-ocr", "warmed up -- first open will be fast")
      return
    } catch {
      await new Promise((r) => setTimeout(r, 500)) // server still booting
    }
  }
}

// Children whose lifetime IS tied to this process (the HMS server only).
const owned = []
let shuttingDown = false
const shutdown = (code = 0) => {
  shuttingDown = true
  for (const child of owned) {
    if (!child.killed) {
      try {
        if (isWin && child.pid) {
          execSync(`taskkill /F /T /PID ${child.pid}`, { stdio: "ignore" })
        } else {
          child.kill("SIGTERM")
        }
      } catch {}
    }
  }
  process.exit(code)
}
process.on("SIGINT", () => shutdown(0))
process.on("SIGTERM", () => shutdown(0))

function run(name, cmd, args, cwd, shell = isWin) {
  const child = spawn(cmd, args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
    shell,
  })
  owned.push(child)
  const pipe = (stream, out) => {
    stream.setEncoding("utf8")
    let buf = ""
    stream.on("data", (chunk) => {
      buf += chunk
      const lines = buf.split("\n")
      buf = lines.pop() ?? ""
      for (const line of lines)
        if (line.trim()) out.write(`[${name}] ${line}\n`)
    })
  }
  pipe(child.stdout, process.stdout)
  pipe(child.stderr, process.stderr)
  child.on("exit", (code) => {
    if (code === 0 || code === null || shuttingDown) return
    console.error(`[${name}] exited with code ${code}`)
    shutdown(code)
  })
  return child
}

// Runs a command to completion, streaming its output (used for the one-time install).
function exec(name, cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const actualCmd =
      isWin && !cmd.endsWith(".cmd") && !cmd.endsWith(".exe")
        ? `${cmd}.cmd`
        : cmd
    const child = run(name, actualCmd, args, cwd, isWin)
    child.on("exit", (code) => {
      const i = owned.indexOf(child)
      if (i !== -1) owned.splice(i, 1)
      code === 0 ? resolve() : reject(new Error(`${name} exited ${code}`))
    })
  })
}

// --- Keppler OCR frontend (port 3000), started detached ----------------------
if (await portInUse(OCR_PORT)) {
  log("keppler-ocr", `already running on port ${OCR_PORT} -- leaving it alone`)
} else if (!existsSync(OCR_DIR)) {
  console.warn(
    `[keppler-ocr] ${OCR_DIR} not found -- skipping (Keppler OCR tab will 502)`,
  )
} else {
  if (!existsSync(path.join(OCR_DIR, "node_modules"))) {
    // React 18 tree here vs React 19 in the host app, so npm ci fails on peers.
    log(
      "keppler-ocr",
      "node_modules missing -- installing (one-time, a few minutes)...",
    )
    const npm = process.platform === "win32" ? "npm.cmd" : "npm"
    await exec(
      "keppler-ocr:install",
      npm,
      ["install", "--legacy-peer-deps"],
      OCR_DIR,
    )
  }
  const ocrBin = viteBin(OCR_DIR)
  if (isWin) {
    run(
      "keppler-ocr",
      ocrBin.cmd,
      [...ocrBin.args, "--port", String(OCR_PORT), "--host", "0.0.0.0"],
      OCR_DIR,
      ocrBin.shell,
    )
    log("keppler-ocr", `started on port ${OCR_PORT}`)
  } else {
    const out = openSync(OCR_LOG, "a")
    const ocr = spawn(
      ocrBin.cmd,
      [...ocrBin.args, "--port", String(OCR_PORT), "--host", "0.0.0.0"],
      {
        cwd: OCR_DIR,
        stdio: ["ignore", out, out],
        detached: true,
        env: process.env,
      },
    )
    ocr.unref() // survives this launcher, so restarting the app won't restart it
    log(
      "keppler-ocr",
      `started on port ${OCR_PORT} (pid ${ocr.pid}), logging to ${path.relative(ROOT, OCR_LOG)}`,
    )
    log(
      "keppler-ocr",
      "stays up across app restarts -- stop it with `npm run dev:stop`",
    )
  }
  warmUp(OCR_PORT, "/keppler-ocr/")
}

// --- HMS frontend ------------------------------------------------------------
if (await portInUse(HMS_PORT)) {
  console.error(
    `[hms] port ${HMS_PORT} is already in use -- another dev server is running.\n` +
      `[hms] Stop it first (e.g. "kill $(lsof -ti tcp:${HMS_PORT})"), or start this one on\n` +
      `[hms] another port with "PORT=${HMS_PORT + 1} npm run dev".`,
  )
  shutdown(1)
}
const hmsBin = viteBin(ROOT)
run(
  "hms",
  hmsBin.cmd,
  [...hmsBin.args, "--host", "0.0.0.0"],
  ROOT,
  hmsBin.shell,
)

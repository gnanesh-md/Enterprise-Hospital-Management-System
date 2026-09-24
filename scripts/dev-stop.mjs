// Stops the detached Keppler OCR dev server that `npm run dev` leaves running.
// (The HMS server is stopped with Ctrl+C in its own terminal.)

import { execFileSync, execSync } from "node:child_process"

const OCR_PORT = 3000

let pids = []
if (process.platform === "win32") {
  try {
    const out = execSync(`netstat -ano`, { encoding: "utf8" })
    for (const line of out.split("\n")) {
      const parts = line.trim().split(/\s+/)
      if (
        parts.length >= 5 &&
        parts[1].endsWith(`:${OCR_PORT}`) &&
        parts[3] === "LISTENING"
      ) {
        pids.push(parts[4])
      }
    }
    pids = [...new Set(pids)]
  } catch {
    // netstat failure
  }
} else {
  try {
    pids = execFileSync("lsof", ["-ti", `tcp:${OCR_PORT}`, "-sTCP:LISTEN"], {
      encoding: "utf8",
    })
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean)
  } catch {
    // lsof exits non-zero when nothing is listening
  }
}

if (pids.length === 0) {
  console.log(`[keppler-ocr] nothing listening on port ${OCR_PORT}`)
} else {
  for (const pid of pids) {
    try {
      if (process.platform === "win32") {
        execSync(`taskkill /F /PID ${pid}`)
      } else {
        process.kill(Number(pid), "SIGTERM")
      }
      console.log(`[keppler-ocr] stopped pid ${pid}`)
    } catch (err) {
      console.error(`[keppler-ocr] could not stop pid ${pid}: ${err.message}`)
    }
  }
}

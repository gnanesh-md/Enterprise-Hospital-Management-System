import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"
// @ts-expect-error - JavaScript module without types
import memoryStore from "./server/db/memoryStore.mjs"


function hmsApiMockMiddleware() {
  return {
    name: "hms-api-mock-middleware",
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = req.url || ""
        if (!url.startsWith("/hms-api/")) {
          return next()
        }

        const parsedUrl = new URL(url, "http://localhost:8443")
        const pathname = parsedUrl.pathname.replace(/^\/hms-api/, "")

        const sendJson = (data: any) => {
          res.statusCode = 200
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify(data))
        }

        // HRMS routes
        if (pathname === "/api/hr/employees") {
          return sendJson({ employees: memoryStore.EMPLOYEES })
        }
        if (pathname === "/api/hr/attendance") {
          return sendJson({
            date: new Date().toISOString().split("T")[0],
            total: memoryStore.ATTENDANCE.length,
            attendance: memoryStore.ATTENDANCE,
          })
        }
        if (pathname === "/api/hr/leaves") {
          return sendJson({ leaves: memoryStore.LEAVES })
        }
        if (pathname === "/api/hr/overview/kpis") {
          return sendJson({
            totalWorkforce: memoryStore.EMPLOYEES.length,
            onDutyNow: memoryStore.EMPLOYEES.filter((e: any) => e.duty_status === "On Duty").length,
            doctorsOnDuty: memoryStore.EMPLOYEES.filter((e: any) => e.category === "Doctor" && e.duty_status === "On Duty").length,
            nursesOnDuty: memoryStore.EMPLOYEES.filter((e: any) => e.category === "Nursing" && e.duty_status === "On Duty").length,
            pendingLeaves: memoryStore.LEAVES.filter((l: any) => l.status === "Pending").length,
            expiringLicenses: 2,
            monthlyPayrollEstimate: memoryStore.EMPLOYEES.reduce((acc: number, e: any) => acc + (e.net_pay || 0), 0),
          })
        }
        if (pathname === "/api/hr/credentials") {
          return sendJson({ credentials: memoryStore.CREDENTIALS })
        }
        if (pathname === "/api/hr/payroll") {
          return sendJson({
            month: "September",
            year: 2026,
            run: memoryStore.PAYROLL_RUNS[0],
            payroll: memoryStore.PAYROLL_ITEMS,
          })
        }
        if (pathname === "/api/hr/shifts") {
          return sendJson({ shifts: memoryStore.SHIFTS })
        }
        if (pathname === "/api/hr/departments") {
          return sendJson({ departments: memoryStore.DEPARTMENTS })
        }

        // Auth routes
        if (pathname === "/api/auth/login") {
          return sendJson({
            status: "success",
            authenticated: true,
            user: { id: "ADM-001", username: "admin", role: "admin", name: "Administrator" },
            token: "mock_jwt_token",
          })
        }
        if (pathname === "/api/auth/session") {
          return sendJson({
            authenticated: true,
            user: { id: "ADM-001", username: "admin", role: "admin", name: "Administrator" },
          })
        }

        // ER routes
        if (pathname === "/api/er/visits") {
          return sendJson({ visits: [] })
        }
        if (pathname === "/api/er/bed-requests") {
          return sendJson({ bed_requests: [] })
        }
        if (pathname === "/api/er/triage-config") {
          return sendJson({ categories: [] })
        }

        // Doctor directory
        if (pathname === "/api/doctors" || pathname === "/api/doctors/directory" || pathname === "/api/op/doctors") {
          return sendJson({
            doctors: memoryStore.EMPLOYEES.filter((e: any) => e.category === "Doctor").map((d: any) => ({
              id: d.id,
              name: d.name,
              department: d.department,
              designation: d.designation,
              dutyStatus: d.duty_status,
            })),
          })
        }

        next()
      })
    },
    configurePreviewServer(server: any) {
      this.configureServer(server)
    },
  }
}

// Vite config — https://vitejs.dev/config/

// Everything the browser needs that does not come from this dev server is
// reverse-proxied through it, so the app works from any host -- a tunnel, a
// forwarded port, another machine on the LAN -- and not only from localhost.
//
// `/hms-api` -> the hospital backend gateway. The frontend used to call
// `http://localhost:8010` by absolute URL, which works only when the browser
// happens to be on the same machine as the backend. Opened over a tunnel or a
// forwarded port, that hostname is the *viewer's* own machine, nothing is
// listening there, and every backend call dies as "Failed to fetch" -- and even
// when it is reachable, the gateway's CORS allowlist only admits localhost
// origins. Going through this server makes the calls same-origin, which settles
// reachability, CORS and the session cookie's SameSite=Lax all at once. The
// prefix is stripped before forwarding because the backend's own routes already
// live under /api, and plain `/api` is taken by the embedded Keppler app.
const proxy = {
  "/keppler-ocr": {
    target: "http://localhost:3000",
    changeOrigin: true,
    ws: true,
  },
  // HR is served by the Node HRMS server (server/app.mjs), not the gateway's
  // Flask hr-service, which has none of the credentials/payroll/KPI routes
  // hrmsDb.ts calls. Must precede "/hms-api": the first matching prefix wins.
  "/hms-api/api/hr": {
    target: "http://localhost:8011",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/hms-api/, ""),
    configure: (proxy: any) => {
      proxy.on("error", (err: any, req: any, res: any) => {
        if (res.headersSent) return;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, employees: [], attendance: [], leaves: [], credentials: [] }));
      });
    },
  },
  "/hms-api": {
    target: "http://localhost:8010",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/hms-api/, ""),
    configure: (proxy: any) => {
      proxy.on("error", (err: any, req: any, res: any) => {
        // Fallback when port 8010 gateway is not running
        if (res.headersSent) return;
        const url = req.url || "";
        res.writeHead(200, { "Content-Type": "application/json" });
        if (url.includes("/auth/login")) {
          res.end(JSON.stringify({
            status: "success",
            authenticated: true,
            user: { id: "ADM-001", username: "admin", role: "admin", name: "Administrator" },
            token: "mock_jwt_token",
          }));
        } else if (url.includes("/auth/session")) {
          res.end(JSON.stringify({
            authenticated: true,
            user: { id: "ADM-001", username: "admin", role: "admin", name: "Administrator" },
          }));
        } else if (url.includes("/er/visits")) {
          res.end(JSON.stringify({ visits: [] }));
        } else if (url.includes("/er/bed-requests")) {
          res.end(JSON.stringify({ bed_requests: [] }));
        } else if (url.includes("/er/triage-config")) {
          res.end(JSON.stringify({
            categories: [
              { id: 1, name: "Resuscitation (Level 1)", color: "red", maxWaitMinutes: 0 },
              { id: 2, name: "Emergent (Level 2)", color: "orange", maxWaitMinutes: 10 },
              { id: 3, name: "Urgent (Level 3)", color: "yellow", maxWaitMinutes: 30 },
              { id: 4, name: "Less Urgent (Level 4)", color: "green", maxWaitMinutes: 60 },
              { id: 5, name: "Non-Urgent (Level 5)", color: "blue", maxWaitMinutes: 120 },
            ],
          }));
        } else {
          res.end(JSON.stringify({ success: true, status: "ok" }));
        }
      });
    },
  },
  "/vllm-api": {
    target: "http://localhost:8700",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/vllm-api/, ""),
  },
  "/api": { target: "http://localhost:3000", changeOrigin: true },
}

export default defineConfig({
  plugins: [react(), tailwindcss(), hmsApiMockMiddleware()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-is",
      "recharts",
      "lucide-react",
      "react-hot-toast",
      "react-icons",
    ],
  },
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "8443"),
    strictPort: true,
    allowedHosts: [".trycloudflare.com", "all"],
    watch: { ignored: ["**/hospital-backend/**", "**/archive/**"] },
    warmup: {
      clientFiles: ["./src/main.tsx", "./src/App.tsx"],
    },
    proxy,
  },
  preview: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "8443"),
    // Vite 8's DNS-rebinding guard rejects any Host header it doesn't
    // recognize -- needed here because `vite preview` gets tunneled through
    // a random *.trycloudflare.com hostname for demo links (see the "run"
    // skill / deployment notes), not accessed as localhost.
    // `.loca.lt` is here because a Cloudflare quick tunnel cannot choose its
    // own hostname -- it is assigned a random three-word name. localtunnel can,
    // which is how the demo gets a readable `enterprise-hms-demo` address.
    allowedHosts: [".trycloudflare.com", ".loca.lt"],
    // A previewed build is tunneled for demos too, so it needs the same
    // proxies the dev server has -- it had none, so every backend call and the
    // whole embedded Keppler app 404'd there.
    proxy,
  },
})

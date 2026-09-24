import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"

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
  "/hms-api": {
    target: "http://localhost:8010",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/hms-api/, ""),
  },
  "/vllm-api": {
    target: "http://localhost:8700",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/vllm-api/, ""),
  },
  "/api": { target: "http://localhost:3000", changeOrigin: true },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
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

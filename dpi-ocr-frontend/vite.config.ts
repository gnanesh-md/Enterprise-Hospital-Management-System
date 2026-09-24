import { defineConfig } from "vite"
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"

function figmaAssetResolver() {
  return {
    name: "figma-asset-resolver",
    resolveId(id) {
      if (id.startsWith("figma:asset/")) {
        const filename = id.replace("figma:asset/", "")
        return path.resolve(__dirname, "src/assets", filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Served through the host HMS app's own dev server at /keppler-ocr (see
  // ../vite.config.ts's proxy) rather than as its own directly-reachable
  // port, since only the host's port is forwarded to the browser.
  base: "/keppler-ocr/",

  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:7620",
    },
    // Allows access via the cloudflared quick-tunnel URL used for remote browser access.
    allowedHosts: true,

    // This app is opened from inside the HMS shell, so the first click on the
    // "Keppler OCR" tab is what pays for Vite's on-demand transform of the
    // whole module graph (~3s cold vs ~0.5s warm). Transform the entry and the
    // app/page modules at server start instead, in the background, so that
    // cost is already paid by the time anyone opens the tab.
    warmup: {
      clientFiles: ["./src/main.tsx", "./src/app/**/*.tsx"],
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ["**/*.svg", "**/*.csv"],
})

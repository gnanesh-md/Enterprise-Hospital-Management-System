import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// Vite config — https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '8443'),
    strictPort: true,
    watch: { ignored: ['**/hospital-backend/**', '**/archive/**'] },
    proxy: {
      // Keppler OCR (dpi-ocr) is embedded via iframe (src/components/DpiOcrPortal.tsx)
      // and runs as its own Vite dev server (dpi-ocr-frontend/, port 3000) that
      // isn't reachable from outside this sandbox — only $PORT (8443) is
      // forwarded to the browser. Proxying it through this same dev server
      // means the iframe only ever needs same-origin, forwarded port 8443.
      // dpi-ocr-frontend/vite.config.ts sets base: '/keppler-ocr/' so its own
      // asset/HMR URLs already carry this prefix; ws:true carries its HMR
      // websocket through too. It proxies /api/* to the OCR backend (7620)
      // itself, so that alone is forwarded here unprefixed.
      '/keppler-ocr': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '8443'),
    // Vite 8's DNS-rebinding guard rejects any Host header it doesn't
    // recognize -- needed here because `vite preview` gets tunneled through
    // a random *.trycloudflare.com hostname for demo links (see the "run"
    // skill / deployment notes), not accessed as localhost.
    allowedHosts: ['.trycloudflare.com'],
  },
})

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

// Read base64 logo from src/assets/receiptLogoBase64.ts
const base64File = path.join(rootDir, "src", "assets", "receiptLogoBase64.ts")
const content = fs.readFileSync(base64File, "utf-8")
const match = content.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/)

if (match && match[1]) {
  const buffer = Buffer.from(match[1], "base64")
  
  // Write to public/logo.png
  fs.writeFileSync(path.join(rootDir, "public", "logo.png"), buffer)
  console.log("Restored public/logo.png (" + buffer.length + " bytes)")
  
  // Write to public/receipt_backside_logo.png
  fs.writeFileSync(path.join(rootDir, "public", "receipt_backside_logo.png"), buffer)
  console.log("Restored public/receipt_backside_logo.png (" + buffer.length + " bytes)")
  
  // Write to src/assets/receipt_backside_logo.png
  fs.writeFileSync(path.join(rootDir, "src", "assets", "receipt_backside_logo.png"), buffer)
  console.log("Restored src/assets/receipt_backside_logo.png (" + buffer.length + " bytes)")
} else {
  console.error("Failed to extract base64 logo")
}

// For kalpra_logo.png, if it's an LFS pointer, also supply a valid logo or reuse logo buffer
const kalpraPath = path.join(rootDir, "public", "kalpra_logo.png")
if (fs.existsSync(kalpraPath)) {
  const currentKalpra = fs.readFileSync(kalpraPath, "utf-8")
  if (currentKalpra.startsWith("version https://git-lfs")) {
    if (match && match[1]) {
      const buffer = Buffer.from(match[1], "base64")
      fs.writeFileSync(kalpraPath, buffer)
      console.log("Restored public/kalpra_logo.png (" + buffer.length + " bytes)")
    }
  }
}

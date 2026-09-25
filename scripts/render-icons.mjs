// Renders public/icons/icon.svg to every PNG size the PWA needs. Run: node scripts/render-icons.mjs
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'

const svg = readFileSync('public/icons/icon.svg', 'utf8')
const targets = [
  { file: 'icon-192.png', size: 192, scale: 1 },
  { file: 'icon-512.png', size: 512, scale: 1 },
  { file: 'apple-touch-icon.png', size: 180, scale: 1 },
  { file: 'favicon-32.png', size: 32, scale: 1 },
  // Maskable: launchers crop to a circle/squircle; keep the pass inside the 80% safe zone.
  { file: 'icon-maskable-512.png', size: 512, scale: 0.78 },
]

const browser = await chromium.launch()
const page = await browser.newPage()
for (const { file, size, scale } of targets) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<html><body style="margin:0;background:#262044">
      <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center">
        <div style="width:${size * scale}px;height:${size * scale}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
      </div></body></html>`,
  )
  await page.screenshot({ path: `public/icons/${file}`, omitBackground: false })
}
await browser.close()

import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1500, height: 940 }, deviceScaleFactor: 2 })
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(800) // fonts

// select the default gradient context bar so the inspector shows its settings
await page.click('.canvas-row .chip:has-text("Context bar")')
await page.waitForTimeout(300)

await page.screenshot({ path: process.argv[2] ?? 'screenshot.png' })
await browser.close()
console.log('shot saved')

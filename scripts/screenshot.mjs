import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1500, height: 940 }, deviceScaleFactor: 2 })
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(800) // fonts

// add a context bar (click-to-add auto-selects it in the inspector)
await page.click('button.palette-item:has-text("Context bar")')
await page.waitForTimeout(200)

// switch its fill mode to gradient
await page.click('aside.inspector button.toggle:has-text("gradient")')
await page.waitForTimeout(200)

// widen it a touch so the ramp reads well
await page.locator('aside.inspector input.field-range').fill('16')
await page.waitForTimeout(300)

await page.screenshot({ path: process.argv[2] ?? 'screenshot.png' })
await browser.close()
console.log('shot saved')

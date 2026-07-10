// Subset the Nerd Fonts symbols font down to the glyphs the editor offers,
// so the preview can render them without shipping a 2.5 MB font.
// Usage: node scripts/subset-nf.mjs <path-to-SymbolsNerdFontMono-Regular.ttf>
import { readFileSync, writeFileSync } from 'node:fs'
import subsetFont from 'subset-font'

// keep in sync with NERD_SEP_GLYPHS / PREFIX_ICONS in src/elements.ts
const GLYPHS =
  '' + // powerline separators
  '' // branch folder clock dollar bolt fire code gauge

const ttf = readFileSync(process.argv[2])
const woff2 = await subsetFont(ttf, GLYPHS, { targetFormat: 'woff2' })
writeFileSync('src/assets/nf-symbols.woff2', woff2)
console.log(`src/assets/nf-symbols.woff2 written (${woff2.length} bytes, ${[...GLYPHS].length} glyphs)`)

import { writeFileSync } from 'node:fs'
import { generateScript } from '../src/exporter'
import { makeInstance } from '../src/elements'

const row1 = [
  makeInstance('model'),
  makeInstance('sep'),
  makeInstance('cwd-basename'),
  makeInstance('git-branch'),
  makeInstance('sep'),
  makeInstance('context-pct'),
  makeInstance('context-bar'),
  makeInstance('cost'),
]
const row2 = [
  makeInstance('cwd-path'),
  makeInstance('project-dir'),
  makeInstance('duration'),
  makeInstance('lines-changed'),
  makeInstance('tokens'),
  makeInstance('output-style'),
  makeInstance('version'),
  makeInstance('session-name'),
  makeInstance('vim-mode'),
  makeInstance('rate-5h'),
  makeInstance('time'),
  makeInstance('text'),
]
// adversarial prefix with quote/dollar/backtick
row1[0].config.prefix = '"$` '

// bar variants: every color mode, 5h/7d bars, duplicate-config dedup
const gradBar = makeInstance('context-bar')
gradBar.config.barColorMode = 'gradient'
gradBar.config.barWidth = 20
gradBar.config.barStyle = 'shade'
const threshBar = makeInstance('rate-5h-bar')
threshBar.config.barColorMode = 'threshold'
threshBar.config.barStyle = 'dots'
const sevenBar = makeInstance('rate-7d-bar')
sevenBar.config.barWidth = 8
sevenBar.config.barStyle = 'thin'
const dupBar = makeInstance('context-bar') // same config as row1's bar → one setup block
const row3 = [gradBar, threshBar, sevenBar, dupBar, makeInstance('rate-7d')]

const script = generateScript({ rows: [row1, row2, row3] })
writeFileSync(process.argv[2] ?? 'statusline-test.sh', script)
console.log('written')

import { writeFileSync } from 'node:fs'
import { generateScript } from './src/exporter'
import { makeInstance } from './src/elements'

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
const script = generateScript({ rows: [row1, row2] })
writeFileSync(process.argv[2] ?? 'statusline-test.sh', script)
console.log('written')

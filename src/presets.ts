import type { ElementInstance, ElementType } from './types'
import { makeInstance } from './elements'

export interface Preset {
  id: string
  name: string
  description: string
  build: () => ElementInstance[][]
}

type Tweak = Parameters<typeof makeInstance>[0] | [ElementType, Partial<ElementInstance['config']>]

/** tiny builder: type name, or [type, config overrides] */
const el = (t: Tweak): ElementInstance => {
  if (Array.isArray(t)) {
    const inst = makeInstance(t[0])
    Object.assign(inst.config, t[1])
    return inst
  }
  return makeInstance(t)
}

const row = (...ts: Tweak[]) => ts.map(el)

const sep = (glyph = '│'): Tweak => ['sep', { extra: glyph, prefix: ' ', suffix: ' ' }]

export const PRESETS: Preset[] = [
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'model, folder, branch, gradient context bar, cost',
    build: () => [
      row(
        'model',
        sep(),
        'cwd-basename',
        'git-branch',
        sep(),
        ['context-bar', { barColorMode: 'gradient', barWidth: 12 }],
        ['context-pct', { prefix: ' ' }],
        sep(),
        'cost',
      ),
    ],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'just model, folder and branch — quiet and subtle',
    build: () => [
      row(
        ['model', { color: 'default', bold: true }],
        sep('·'),
        ['cwd-basename', { color: 'bright-black' }],
        ['git-branch', { color: 'bright-black', dim: true }],
      ),
    ],
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'two dense lines: workspace on top, usage meters below',
    build: () => [
      row(
        'model',
        sep(),
        'project-dir',
        'git-branch',
        sep(),
        'lines-changed',
        sep(),
        ['session-name', { color: 'bright-magenta' }],
      ),
      row(
        ['context-bar', { barColorMode: 'threshold', barWidth: 14 }],
        ['context-pct', { prefix: ' ' }],
        sep(),
        ['tokens', { suffix: ' tok' }],
        sep(),
        'cost',
        ['duration', { prefix: ' ' }],
        sep(),
        ['rate-5h', { suffix: '% 5h' }],
        ['rate-7d', { prefix: ' ', suffix: '% 7d' }],
      ),
    ],
  },
  {
    id: 'gradient',
    name: 'Gradient',
    description: 'per-character ramps on text and a wide shaded bar',
    build: () => [
      row(
        ['model', { color: 'gradient', bold: true, barLow: '#8fb5e8', barMid: '#c584c9', barHigh: '#e05f5f' }],
        sep(),
        ['cwd-basename', { color: 'gradient', barLow: '#87c05f', barMid: '#5fb8b0', barHigh: '#6f9bd8' }],
        'git-branch',
        sep(),
        ['context-bar', { barColorMode: 'gradient', barStyle: 'shade', barWidth: 16 }],
        ['context-pct', { prefix: ' ' }],
      ),
    ],
  },
  {
    id: 'arrows',
    name: 'Arrows',
    description: 'prompt-style ❯ separators with bold accents',
    build: () => [
      row(
        ['model', { color: 'magenta', bold: true }],
        ['sep', { extra: '❯', color: 'yellow', prefix: ' ', suffix: ' ' }],
        ['cwd-basename', { color: 'blue', bold: true }],
        ['sep', { extra: '❯', color: 'yellow', prefix: ' ', suffix: ' ' }],
        ['git-branch', { color: 'green', prefix: '' }],
        ['sep', { extra: '❯', color: 'yellow', prefix: ' ', suffix: ' ' }],
        ['context-pct', { color: 'cyan', suffix: ' ctx' }],
        ['cost', { prefix: ' ', color: 'bright-yellow' }],
      ),
    ],
  },
]

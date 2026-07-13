import type { AnsiColor, ElementConfig } from './types'

/** Mock stdin payload used to drive the live preview (mirrors real schema).
 *  Mutable: the mock data panel edits it in place, then bumps a version
 *  counter in App so the preview re-renders. */
export const MOCK = {
  session_id: 'f3b1c2d4',
  session_name: 'editor',
  model: { id: 'claude-fable-5', display_name: 'Fable' },
  workspace: {
    current_dir: '/home/dev/projects/statusline-editor/src',
    project_dir: '/home/dev/projects/statusline-editor',
  },
  version: '2.1.90',
  output_style: { name: 'default' },
  cost: {
    total_cost_usd: 1.2345,
    total_duration_ms: 2712000,
    total_lines_added: 156,
    total_lines_removed: 23,
  },
  context_window: {
    total_input_tokens: 84500,
    context_window_size: 200000,
    used_percentage: 42,
    remaining_percentage: 58,
  },
  rate_limits: {
    five_hour: {
      used_percentage: 23.5,
      resets_at: Math.floor(Date.now() / 1000) + 2 * 3600 + 13 * 60,
    },
    seven_day: {
      used_percentage: 41.2,
      resets_at: Math.floor(Date.now() / 1000) + 3 * 86400 + 7 * 3600,
    },
  },
  vim: { mode: 'NORMAL' },
  gitBranch: 'feat/element-palette',
  clock: '14:32',
}

const DEFAULT_MOCK_JSON = JSON.stringify(MOCK)
const MOCK_KEY = 'ccse-mock-v1'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMerge(target: any, source: any) {
  for (const k of Object.keys(source)) {
    if (
      source[k] &&
      typeof source[k] === 'object' &&
      !Array.isArray(source[k]) &&
      target[k] &&
      typeof target[k] === 'object'
    ) {
      deepMerge(target[k], source[k])
    } else if (typeof source[k] === typeof target[k]) {
      target[k] = source[k]
    }
  }
}

export function resetMock() {
  deepMerge(MOCK, JSON.parse(DEFAULT_MOCK_JSON))
  try {
    localStorage.removeItem(MOCK_KEY)
  } catch {
    /* best-effort */
  }
}

export function saveMock() {
  try {
    localStorage.setItem(MOCK_KEY, JSON.stringify(MOCK))
  } catch {
    /* best-effort */
  }
}

export function loadMock() {
  try {
    const raw = localStorage.getItem(MOCK_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    // resets_at values are relative to load time — a saved epoch goes stale
    // (and even lands in the past), so always keep the fresh defaults
    delete parsed?.rate_limits?.five_hour?.resets_at
    delete parsed?.rate_limits?.seven_day?.resets_at
    deepMerge(MOCK, parsed)
  } catch {
    /* best-effort */
  }
}

/** Terminal theme used by the preview pane (warm dark, WezTerm-ish). */
export const ANSI_HEX: Record<AnsiColor, string> = {
  default: '#d6d2c8',
  black: '#1a1a20',
  red: '#e05f5f',
  green: '#87c05f',
  yellow: '#d9a854',
  blue: '#6f9bd8',
  magenta: '#c584c9',
  cyan: '#5fb8b0',
  white: '#d6d2c8',
  'bright-black': '#6b6860',
  'bright-red': '#f08080',
  'bright-green': '#a3d67f',
  'bright-yellow': '#ecc678',
  'bright-blue': '#8fb5e8',
  'bright-magenta': '#dba3de',
  'bright-cyan': '#7fd0c8',
  'bright-white': '#f2efe6',
}

/** Approximate rendering of the same ANSI slots on a light-background terminal
 *  (e.g. Terminal.app "Basic" light profile). Named colors get darkened for
 *  legibility, but 'default'/'white'/'bright-white' are left as real terminals
 *  render them — near-invisible on a light bg — so the toggle actually surfaces
 *  color choices that break there. */
export const ANSI_HEX_LIGHT: Record<AnsiColor, string> = {
  default: '#24241f',
  black: '#24241f',
  red: '#a83030',
  green: '#3f7d33',
  yellow: '#8a6a1a',
  blue: '#2f5fa8',
  magenta: '#8a3f96',
  cyan: '#1f7a72',
  white: '#d6d2c8',
  'bright-black': '#8a8a82',
  'bright-red': '#c24545',
  'bright-green': '#5a9a4a',
  'bright-yellow': '#a5841f',
  'bright-blue': '#4a78bf',
  'bright-magenta': '#a558af',
  'bright-cyan': '#3a948b',
  'bright-white': '#f2efe6',
}

export const ANSI_FG_CODE: Record<AnsiColor, string> = {
  default: '',
  black: '30',
  red: '31',
  green: '32',
  yellow: '33',
  blue: '34',
  magenta: '35',
  cyan: '36',
  white: '37',
  'bright-black': '90',
  'bright-red': '91',
  'bright-green': '92',
  'bright-yellow': '93',
  'bright-blue': '94',
  'bright-magenta': '95',
  'bright-cyan': '96',
  'bright-white': '97',
}

/** display hex for an element's configured color (ANSI or custom); pass
 *  ANSI_HEX_LIGHT to preview against a light-background terminal instead */
export const configHex = (c: ElementConfig, palette: Record<AnsiColor, string> = ANSI_HEX): string =>
  c.color === 'custom' ? c.customColor : c.color === 'gradient' ? c.barMid : palette[c.color]

/** grid display order (8×2 with the custom picker appended last): each normal
 *  color sits directly above its bright variant — default over bright-white,
 *  bright-black over the custom cell. 'white' is omitted (visually identical
 *  to 'default', which emits no color code and follows the terminal theme). */
export const ANSI_ORDER: AnsiColor[] = [
  'default',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'bright-black',
  'bright-white',
  'bright-red',
  'bright-green',
  'bright-yellow',
  'bright-blue',
  'bright-magenta',
  'bright-cyan',
]

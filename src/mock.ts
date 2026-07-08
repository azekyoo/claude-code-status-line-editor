import type { AnsiColor } from './types'

/** Mock stdin payload used to drive the live preview (mirrors real schema). */
export const MOCK = {
  session_id: 'f3b1c2d4',
  session_name: 'editor',
  model: { id: 'claude-fable-5', display_name: 'Fable' },
  workspace: {
    current_dir: '/home/gaspard/projects/statusline-editor/src',
    project_dir: '/home/gaspard/projects/statusline-editor',
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
    five_hour: { used_percentage: 23.5 },
    seven_day: { used_percentage: 41.2 },
  },
  vim: { mode: 'NORMAL' },
  gitBranch: 'feat/element-palette',
  clock: '14:32',
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

export const ANSI_ORDER: AnsiColor[] = [
  'default',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'bright-black',
  'bright-red',
  'bright-green',
  'bright-yellow',
  'bright-blue',
  'bright-magenta',
  'bright-cyan',
  'bright-white',
]

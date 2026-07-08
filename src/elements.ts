import type { ElementConfig, ElementDef, ElementType } from './types'
import { MOCK } from './mock'
import { BAR_SOURCES, barCells, buildBarSetup } from './bar'

const basename = (p: string) => p.split('/').filter(Boolean).pop() ?? p

const fmtDuration = (ms: number) => {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

const fmtTokens = (t: number) => (t >= 1000 ? `${Math.round(t / 1000)}k` : `${t}`)

const barPreview = (pct: number) => (c: ElementConfig) =>
  barCells(pct, c)
    .map((cell) => cell.ch)
    .join('')

const barEmit = (type: ElementType) => (c: ElementConfig) => {
  const src = BAR_SOURCES[type]!
  return buildBarSetup(c, src.source, src.keyBase)
}

const fmtUntil = (epoch: number) => {
  const d = Math.max(0, epoch - Math.floor(Date.now() / 1000))
  if (d >= 86400) return `${Math.floor(d / 86400)}d ${Math.floor((d % 86400) / 3600)}h`
  if (d >= 3600) return `${Math.floor(d / 3600)}h ${Math.floor((d % 3600) / 60)}m`
  return `${Math.floor(d / 60)}m`
}

/** countdown-to-reset setup shared by the 5h/7d reset elements */
const resetSetup = (jqPath: string, v: string, t: string) => [
  `${t}=$(j '${jqPath} // 0 | floor')`,
  `if (( ${t} > 0 )); then`,
  `  ${t}=$(( ${t} - $(date +%s) )); (( ${t} < 0 )) && ${t}=0`,
  `  if (( ${t} >= 86400 )); then ${v}="$(( ${t} / 86400 ))d $(( (${t} % 86400) / 3600 ))h"`,
  `  elif (( ${t} >= 3600 )); then ${v}="$(( ${t} / 3600 ))h $(( (${t} % 3600) / 60 ))m"`,
  `  else ${v}="$(( ${t} / 60 ))m"; fi`,
  `else ${v}=""; fi`,
]

export const ELEMENT_DEFS: Record<ElementType, ElementDef> = {
  model: {
    type: 'model',
    label: 'Model',
    hint: 'Active model display name',
    category: 'session',
    defaults: { color: 'magenta', bold: true },
    preview: () => MOCK.model.display_name,
    emit: () => ({
      setup: [`seg_model="$(j '.model.display_name // "?"')"`],
      value: '${seg_model}',
    }),
  },
  'cwd-basename': {
    type: 'cwd-basename',
    label: 'Folder',
    hint: 'Basename of current directory',
    category: 'workspace',
    defaults: { color: 'blue', bold: true },
    preview: () => basename(MOCK.workspace.current_dir),
    emit: () => ({
      setup: [`seg_dir="$(basename "$(j '.workspace.current_dir // "?"')")"`],
      value: '${seg_dir}',
    }),
  },
  'cwd-path': {
    type: 'cwd-path',
    label: 'Full path',
    hint: 'Current directory, ~ shortened',
    category: 'workspace',
    defaults: { color: 'blue' },
    preview: () => MOCK.workspace.current_dir.replace('/home/gaspard', '~'),
    emit: () => ({
      setup: [`seg_path="$(j '.workspace.current_dir // "?"')"`, `seg_path="\${seg_path/#$HOME/\\~}"`],
      value: '${seg_path}',
    }),
  },
  'project-dir': {
    type: 'project-dir',
    label: 'Project',
    hint: 'Basename of project root',
    category: 'workspace',
    defaults: { color: 'bright-blue', bold: true },
    preview: () => basename(MOCK.workspace.project_dir),
    emit: () => ({
      setup: [`seg_proj="$(basename "$(j '.workspace.project_dir // "?"')")"`],
      value: '${seg_proj}',
    }),
  },
  'git-branch': {
    type: 'git-branch',
    label: 'Git branch',
    hint: 'Current branch (via git, empty outside repos)',
    category: 'workspace',
    defaults: { color: 'green', prefix: ' ' },
    preview: () => MOCK.gitBranch,
    emit: () => ({
      setup: [
        `seg_branch="$(git -C "$(j '.workspace.current_dir // "."')" branch --show-current 2>/dev/null)"`,
      ],
      value: '${seg_branch}',
    }),
  },
  cost: {
    type: 'cost',
    label: 'Cost',
    hint: 'Session cost in USD',
    category: 'usage',
    defaults: { color: 'yellow' },
    preview: () => `$${MOCK.cost.total_cost_usd.toFixed(2)}`,
    emit: () => ({
      setup: [`seg_cost="$(printf '$%.2f' "$(j '.cost.total_cost_usd // 0')")"`],
      value: '${seg_cost}',
    }),
  },
  duration: {
    type: 'duration',
    label: 'Duration',
    hint: 'Total session duration',
    category: 'usage',
    defaults: { color: 'bright-black' },
    preview: () => fmtDuration(MOCK.cost.total_duration_ms),
    emit: () => ({
      setup: [
        `_ms=$(j '.cost.total_duration_ms // 0'); _s=$(( \${_ms%.*} / 1000 ))`,
        `if (( _s >= 3600 )); then seg_dur="$(( _s / 3600 ))h $(( (_s % 3600) / 60 ))m"`,
        `elif (( _s >= 60 )); then seg_dur="$(( _s / 60 ))m $(( _s % 60 ))s"`,
        `else seg_dur="\${_s}s"; fi`,
      ],
      value: '${seg_dur}',
    }),
  },
  'lines-changed': {
    type: 'lines-changed',
    label: 'Lines ±',
    hint: 'Lines added / removed (fixed green/red)',
    category: 'usage',
    defaults: {},
    preview: () => `+${MOCK.cost.total_lines_added} -${MOCK.cost.total_lines_removed}`,
    emit: () => ({
      setup: [
        `seg_lines=$'\\e[32m'"+$(j '.cost.total_lines_added // 0')"$'\\e[0m \\e[31m'"-$(j '.cost.total_lines_removed // 0')"$'\\e[0m'`,
      ],
      value: '${seg_lines}',
    }),
  },
  'context-pct': {
    type: 'context-pct',
    label: 'Context %',
    hint: 'Context window used',
    category: 'usage',
    defaults: { color: 'cyan' },
    preview: () => `${MOCK.context_window.used_percentage}%`,
    emit: () => ({
      setup: [`seg_ctx="$(j '.context_window.used_percentage // 0 | round')%"`],
      value: '${seg_ctx}',
    }),
  },
  'context-bar': {
    type: 'context-bar',
    label: 'Context bar',
    hint: 'Context usage gauge (style, width, gradient in inspector)',
    category: 'usage',
    defaults: { color: 'cyan' },
    preview: barPreview(MOCK.context_window.used_percentage),
    emit: barEmit('context-bar'),
  },
  'rate-5h-bar': {
    type: 'rate-5h-bar',
    label: '5h bar',
    hint: '5-hour rate limit gauge (subscribers)',
    category: 'usage',
    defaults: { color: 'yellow' },
    preview: barPreview(MOCK.rate_limits.five_hour.used_percentage),
    emit: barEmit('rate-5h-bar'),
  },
  'rate-7d-bar': {
    type: 'rate-7d-bar',
    label: '7d bar',
    hint: '7-day rate limit gauge (subscribers)',
    category: 'usage',
    defaults: { color: 'magenta' },
    preview: barPreview(MOCK.rate_limits.seven_day.used_percentage),
    emit: barEmit('rate-7d-bar'),
  },
  tokens: {
    type: 'tokens',
    label: 'Tokens',
    hint: 'Total input tokens',
    category: 'usage',
    defaults: { color: 'bright-cyan' },
    preview: () => fmtTokens(MOCK.context_window.total_input_tokens),
    emit: () => ({
      setup: [
        `seg_tok="$(j '(.context_window.total_input_tokens // 0) as $t | if $t >= 1000 then "\\($t / 1000 | round)k" else "\\($t)" end')"`,
      ],
      value: '${seg_tok}',
    }),
  },
  'output-style': {
    type: 'output-style',
    label: 'Output style',
    hint: 'Active output style name',
    category: 'session',
    defaults: { color: 'bright-black' },
    preview: () => MOCK.output_style.name,
    emit: () => ({
      setup: [`seg_style="$(j '.output_style.name // "default"')"`],
      value: '${seg_style}',
    }),
  },
  version: {
    type: 'version',
    label: 'CC version',
    hint: 'Claude Code version',
    category: 'session',
    defaults: { color: 'bright-black', prefix: 'v' },
    preview: () => MOCK.version,
    emit: () => ({
      setup: [`seg_ver="$(j '.version // "?"')"`],
      value: '${seg_ver}',
    }),
  },
  'session-name': {
    type: 'session-name',
    label: 'Session',
    hint: 'Session name (if set via /rename)',
    category: 'session',
    defaults: { color: 'bright-magenta' },
    preview: () => MOCK.session_name,
    emit: () => ({
      setup: [`seg_sess="$(j '.session_name // ""')"`],
      value: '${seg_sess}',
    }),
  },
  'vim-mode': {
    type: 'vim-mode',
    label: 'Vim mode',
    hint: 'NORMAL / INSERT (if vim mode on)',
    category: 'session',
    defaults: { color: 'bright-yellow', bold: true },
    preview: () => MOCK.vim.mode,
    emit: () => ({
      setup: [`seg_vim="$(j '.vim.mode // ""')"`],
      value: '${seg_vim}',
    }),
  },
  'rate-5h': {
    type: 'rate-5h',
    label: '5h limit',
    hint: '5-hour window used % (subscribers)',
    category: 'usage',
    defaults: { color: 'bright-black', suffix: '% used' },
    preview: () => `${Math.round(MOCK.rate_limits.five_hour.used_percentage)}`,
    emit: () => ({
      setup: [`seg_rate5="$(j '.rate_limits.five_hour.used_percentage // 0 | round')"`],
      value: '${seg_rate5}',
    }),
  },
  'rate-7d': {
    type: 'rate-7d',
    label: '7d limit',
    hint: '7-day window used % (subscribers)',
    category: 'usage',
    defaults: { color: 'bright-black', suffix: '% used' },
    preview: () => `${Math.round(MOCK.rate_limits.seven_day.used_percentage)}`,
    emit: () => ({
      setup: [`seg_rate7="$(j '.rate_limits.seven_day.used_percentage // 0 | round')"`],
      value: '${seg_rate7}',
    }),
  },
  'rate-5h-reset': {
    type: 'rate-5h-reset',
    label: '5h reset',
    hint: 'Time until the 5-hour window resets',
    category: 'usage',
    defaults: { color: 'bright-black', prefix: 'resets ' },
    preview: () => fmtUntil(MOCK.rate_limits.five_hour.resets_at),
    emit: () => ({
      setup: resetSetup('.rate_limits.five_hour.resets_at', 'seg_r5rst', '_t5'),
      value: '${seg_r5rst}',
    }),
  },
  'rate-7d-reset': {
    type: 'rate-7d-reset',
    label: '7d reset',
    hint: 'Time until the 7-day window resets',
    category: 'usage',
    defaults: { color: 'bright-black', prefix: 'resets ' },
    preview: () => fmtUntil(MOCK.rate_limits.seven_day.resets_at),
    emit: () => ({
      setup: resetSetup('.rate_limits.seven_day.resets_at', 'seg_r7rst', '_t7'),
      value: '${seg_r7rst}',
    }),
  },
  time: {
    type: 'time',
    label: 'Clock',
    hint: 'Current time HH:MM',
    category: 'decor',
    defaults: { color: 'bright-black' },
    preview: () => MOCK.clock,
    emit: () => ({
      setup: [`seg_time="$(date +%H:%M)"`],
      value: '${seg_time}',
    }),
  },
  text: {
    type: 'text',
    label: 'Text',
    hint: 'Custom static text',
    category: 'decor',
    defaults: { color: 'default', extra: '❯' },
    preview: (c: ElementConfig) => c.extra,
    emit: () => ({ setup: [], value: '' }), // literal, handled inline by exporter
  },
  sep: {
    type: 'sep',
    label: 'Separator',
    hint: 'Divider glyph between segments',
    category: 'decor',
    defaults: { color: 'bright-black', dim: true, extra: '│' },
    preview: (c: ElementConfig) => c.extra,
    emit: () => ({ setup: [], value: '' }), // literal, handled inline by exporter
  },
}

export const DEFAULT_CONFIG: ElementConfig = {
  color: 'default',
  customColor: '#d9a854',
  bold: false,
  dim: false,
  prefix: '',
  suffix: '',
  extra: '',
  barStyle: 'blocks',
  barWidth: 10,
  barColorMode: 'solid',
  barLow: '#87c05f',
  barMid: '#d9a854',
  barHigh: '#e05f5f',
}

let counter = 0
export function makeInstance(type: ElementType) {
  const def = ELEMENT_DEFS[type]
  return {
    id: `el-${++counter}-${type}`,
    type,
    config: { ...DEFAULT_CONFIG, ...def.defaults },
  }
}

export const SEP_GLYPHS = ['│', '•', '·', '|', '❯', '»', '─', '◆', '⋮', ' ']

export const CATEGORIES: { key: ElementDef['category']; title: string }[] = [
  { key: 'session', title: 'Session' },
  { key: 'workspace', title: 'Workspace' },
  { key: 'usage', title: 'Usage' },
  { key: 'decor', title: 'Decor' },
]

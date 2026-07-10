import type { Doc, ElementInstance, ElementType } from './types'
import { ELEMENT_DEFS, hasNerdGlyphs } from './elements'
import { ANSI_FG_CODE } from './mock'
import { BAR_TYPES, hexToRgb, nearestAnsiCode } from './bar'

/** types that can't take a per-character text gradient: bars have their own
 *  fill modes, lines-changed embeds its own escape codes in the value */
export const NO_TEXT_GRADIENT = new Set<ElementType>([...BAR_TYPES, 'lines-changed'])

const usesTextGradient = (el: ElementInstance) =>
  el.config.color === 'gradient' && !NO_TEXT_GRADIENT.has(el.type)

/** locate jq (PATH, override env var, common install spots) or print a
 *  minimal line instead of a blank status line */
const JQ_PROBE = [
  'JQ_BIN="${CLAUDE_STATUSLINE_JQ:-jq}"',
  'if ! command -v "$JQ_BIN" >/dev/null 2>&1; then',
  '  for _cand in "$HOME/bin/jq" "$HOME/bin/jq.exe" /usr/local/bin/jq /opt/homebrew/bin/jq /c/ProgramData/chocolatey/bin/jq.exe; do',
  '    [[ -x "$_cand" ]] && JQ_BIN="$_cand" && break',
  '  done',
  'fi',
  'if ! command -v "$JQ_BIN" >/dev/null 2>&1; then',
  `  printf '%s\\n' 'statusline: jq not found (install: https://jqlang.org)'`,
  '  exit 0',
  'fi',
]

/** 24-bit color support detection (Windows Terminal sets WT_SESSION but not COLORTERM) */
const TRUECOLOR_DETECT = [
  'USE_TRUECOLOR=0',
  'if [[ "${COLORTERM:-}" == "truecolor" || "${COLORTERM:-}" == "24bit" || -n "${WT_SESSION:-}" ]]; then',
  '  USE_TRUECOLOR=1',
  'fi',
]

/** per-character slicing needs a UTF-8 locale; probe for one if none is set
 *  (C.UTF-8 does not exist on macOS, en_US.UTF-8 does) */
const LOCALE_PROBE = [
  'if [[ -z "${LC_ALL:-}${LC_CTYPE:-}${LANG:-}" ]]; then',
  `  if locale -a 2>/dev/null | grep -qiE '^C\\.utf-?8$'; then export LC_ALL=C.UTF-8`,
  `  elif locale -a 2>/dev/null | grep -q '^en_US\\.UTF-8$'; then export LC_ALL=en_US.UTF-8`,
  '  fi',
  'fi',
]

/** runtime per-character gradient:
 *  grad <text> <lowRGB> <midRGB> <highRGB> <fallback-escape>
 *  without truecolor the whole text takes the fallback color */
const GRAD_FN = [
  'grad() {',
  '  local t="$1" n=${#1} o="" i u r g b',
  `  if (( ! USE_TRUECOLOR )); then printf '%s' "\${11}\${t}"$'\\e[0m'; return; fi`,
  '  for ((i=0; i<n; i++)); do',
  '    u=$(( n > 1 ? i * 200 / (n - 1) : 0 ))',
  '    if (( u <= 100 )); then',
  '      r=$(( $2 + ($5 - $2) * u / 100 )); g=$(( $3 + ($6 - $3) * u / 100 )); b=$(( $4 + ($7 - $4) * u / 100 ))',
  '    else',
  '      r=$(( $5 + ($8 - $5) * (u - 100) / 100 )); g=$(( $6 + ($9 - $6) * (u - 100) / 100 )); b=$(( $7 + (${10} - $7) * (u - 100) / 100 ))',
  '    fi',
  `    o+=$'\\e[38;2;'"\${r};\${g};\${b}m\${t:i:1}"`,
  '  done',
  `  printf '%s' "$o"$'\\e[0m'`,
  '}',
]

/** Element types whose segment may legitimately be empty at runtime —
 *  wrap them in a guard so prefix/suffix don't print alone. */
const OPTIONAL_TYPES = new Set<ElementType>([
  'git-branch',
  'session-name',
  'vim-mode',
  'rate-5h-reset',
  'rate-7d-reset',
])

const OPTIONAL_VAR: Partial<Record<ElementType, string>> = {
  'git-branch': 'seg_branch',
  'session-name': 'seg_sess',
  'vim-mode': 'seg_vim',
}

/** segment variable to guard on when the element may be empty at runtime */
function optionalVar(el: ElementInstance): string | null {
  // repo-diff lines are empty outside repos and when the tree is clean
  if (el.type === 'lines-changed') return el.config.extra === 'session' ? null : 'seg_glines'
  // reset elements pick their variable by display mode (countdown vs clock)
  if (el.type === 'rate-5h-reset' || el.type === 'rate-7d-reset') {
    const base = el.type === 'rate-5h-reset' ? 'seg_r5rst' : 'seg_r7rst'
    return el.config.extra === 'clock' ? `${base}_ck` : `${base}_cd`
  }
  return OPTIONAL_TYPES.has(el.type) ? (OPTIONAL_VAR[el.type] ?? null) : null
}

/** Escape a literal string for inclusion inside bash double quotes. */
const bashQuote = (s: string) => s.replace(/[\\"$`]/g, (m) => '\\' + m)

/** shell variable holding the (truecolor or fallback) escape for a custom hex */
const customColorVar = (hex: string) => `C_${hex.replace('#', '').toLowerCase()}`

function sgrCodes(el: ElementInstance): string {
  const codes: string[] = []
  if (el.config.bold) codes.push('1')
  if (el.config.dim) codes.push('2')
  // custom colors resolve through a C_<hex> variable, gradients through grad()
  if (usesTextGradient(el) || el.config.color === 'custom') return codes.join(';')
  const fg =
    el.config.color === 'gradient'
      ? '' // excluded type fell back to default color
      : ANSI_FG_CODE[el.config.color]
  if (fg) codes.push(fg)
  return codes.join(';')
}

function segmentExpr(el: ElementInstance): string {
  const def = ELEMENT_DEFS[el.type]
  const isLiteral = el.type === 'text' || el.type === 'sep'
  const value = isLiteral ? bashQuote(el.config.extra) : def.emit(el.config).value
  const inner = bashQuote(el.config.prefix) + value + bashQuote(el.config.suffix)
  const codes = sgrCodes(el)
  if (usesTextGradient(el)) {
    const stops = [el.config.barLow, el.config.barMid, el.config.barHigh]
      .flatMap(hexToRgb)
      .join(' ')
    const fallback = `$'\\e[${nearestAnsiCode(el.config.barMid)}m'`
    const call = `"$(grad "${inner}" ${stops} ${fallback})"`
    return codes ? `$'\\e[${codes}m'${call}` : call
  }
  if (el.config.color === 'custom') {
    const vn = customColorVar(el.config.customColor)
    const pre = codes ? `$'\\e[${codes}m'` : ''
    return `${pre}"\${${vn}}${inner}"$'\\e[0m'`
  }
  if (!codes) return `"${inner}"`
  return `$'\\e[${codes}m'"${inner}"$'\\e[0m'`
}

export function generateScript(doc: Doc): string {
  const els = doc.rows.flat()
  const hasTextGradient = els.some(usesTextGradient)
  const customHexes = [
    ...new Set(
      els.filter((e) => e.config.color === 'custom').map((e) => e.config.customColor.toLowerCase()),
    ),
  ]
  const needsTruecolor =
    hasTextGradient ||
    customHexes.length > 0 ||
    els.some((e) => BAR_TYPES.has(e.type) && e.config.barColorMode !== 'solid')

  const usesNerd = els.some(
    (e) => hasNerdGlyphs(e.config.prefix) || hasNerdGlyphs(e.config.suffix) || hasNerdGlyphs(e.config.extra),
  )

  const lines: string[] = [
    '#!/usr/bin/env bash',
    '# Claude Code status line — generated by Claude Code Statusline Editor',
    '# Reads the statusline JSON payload on stdin and prints the status line.',
    '# Requires: jq  (https://jqlang.org)',
    ...(usesNerd
      ? ['# Uses Nerd Font glyphs — set your terminal font to a Nerd Font (https://www.nerdfonts.com)']
      : []),
    '',
    ...JQ_PROBE,
    '',
    'input=$(cat)',
    // native Windows jq.exe writes CRLF; strip stray CR from every field
    `j() { printf '%s' "$input" | "$JQ_BIN" -r "$1" | tr -d '\\r'; }`,
    '',
  ]

  if (needsTruecolor) lines.push(...TRUECOLOR_DETECT, '')
  if (hasTextGradient) lines.push(...LOCALE_PROBE, '', ...GRAD_FN, '')

  for (const hex of customHexes) {
    const vn = customColorVar(hex)
    lines.push(
      `if (( USE_TRUECOLOR )); then ${vn}=$'\\e[38;2;${hexToRgb(hex).join(';')}m'; else ${vn}=$'\\e[${nearestAnsiCode(hex)}m'; fi`,
    )
  }
  if (customHexes.length > 0) lines.push('')

  // Setup blocks, deduped by content: bar variables embed their config, so
  // two bars with different settings emit distinct blocks while identical
  // segments share one.
  const seenBlocks = new Set<string>()
  for (const row of doc.rows) {
    for (const el of row) {
      const setup = ELEMENT_DEFS[el.type].emit(el.config).setup
      if (setup.length === 0) continue
      const block = setup.join('\n')
      if (seenBlocks.has(block)) continue
      seenBlocks.add(block)
      lines.push(...setup)
    }
  }
  if (seenBlocks.size > 0) lines.push('')

  doc.rows.forEach((row, i) => {
    const v = `line${i + 1}`
    lines.push(`${v}=""`)
    for (const el of row) {
      const expr = segmentExpr(el)
      const guard = optionalVar(el)
      if (guard) {
        lines.push(`[[ -n "\${${guard}}" ]] && ${v}+=${expr}`)
      } else {
        lines.push(`${v}+=${expr}`)
      }
    }
    lines.push(`printf '%s\\n' "$${v}"`)
    lines.push('')
  })

  return lines.join('\n') + '\n'
}

export const SETTINGS_SNIPPET = `{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh"
  }
}`

export function downloadScript(doc: Doc) {
  const blob = new Blob([generateScript(doc)], { type: 'text/x-shellscript' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'statusline.sh'
  a.click()
  URL.revokeObjectURL(url)
}

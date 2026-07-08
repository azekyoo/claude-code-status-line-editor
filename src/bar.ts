import type { BarColorMode, BarStyle, ElementConfig, ElementType } from './types'
import { ANSI_FG_CODE, ANSI_HEX, ANSI_ORDER } from './mock'

/** nearest 16-color ANSI code for a hex color — used as the no-truecolor fallback */
export function nearestAnsiCode(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  let best = 'yellow' as (typeof ANSI_ORDER)[number]
  let bd = Infinity
  for (const c of ANSI_ORDER) {
    if (c === 'default') continue
    const [cr, cg, cb] = hexToRgb(ANSI_HEX[c])
    const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2
    if (d < bd) {
      bd = d
      best = c
    }
  }
  return ANSI_FG_CODE[best]
}

export const BAR_GLYPHS: Record<BarStyle, { fill: string; empty: string }> = {
  blocks: { fill: '█', empty: '░' },
  shade: { fill: '▓', empty: '░' },
  segments: { fill: '▰', empty: '▱' },
  dots: { fill: '●', empty: '○' },
  thin: { fill: '━', empty: '─' },
  ascii: { fill: '#', empty: '-' },
}

export const BAR_STYLES = Object.keys(BAR_GLYPHS) as BarStyle[]

export const BAR_COLOR_MODES: { key: BarColorMode; label: string; hint: string }[] = [
  { key: 'solid', label: 'solid', hint: 'element color' },
  { key: 'threshold', label: 'threshold', hint: 'green → yellow → red by usage' },
  { key: 'gradient', label: 'gradient', hint: 'per-cell green→red ramp (truecolor)' },
]

export const BAR_TYPES = new Set<ElementType>(['context-bar', 'rate-5h-bar', 'rate-7d-bar'])

export const BAR_STOP_DEFAULTS = { low: '#87c05f', mid: '#d9a854', high: '#e05f5f' }

export function hexToRgb(hex: string): number[] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return [214, 210, 200] // theme ink fallback for malformed input
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

const lerp3 = (a: number[], b: number[], t: number) =>
  a.map((v, i) => Math.round(v + (b[i] - v) * t))

/** color of gradient cell i out of w (0-based) across low→mid→high stops */
export function gradientRgb(i: number, w: number, c: ElementConfig): number[] {
  const u = w > 1 ? (i * 200) / (w - 1) : 0
  const [low, mid, high] = [hexToRgb(c.barLow), hexToRgb(c.barMid), hexToRgb(c.barHigh)]
  return u <= 100 ? lerp3(low, mid, u / 100) : lerp3(mid, high, (u - 100) / 100)
}

const toHex = (rgb: number[]) =>
  '#' + rgb.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')

export const thresholdHex = (pct: number, c: ElementConfig) =>
  pct >= 80 ? c.barHigh : pct >= 50 ? c.barMid : c.barLow

export interface BarCell {
  ch: string
  /** null → inherit element color (solid mode) */
  color: string | null
}

/** preview cells for the fake terminal */
export function barCells(pct: number, c: ElementConfig): BarCell[] {
  const w = c.barWidth
  const g = BAR_GLYPHS[c.barStyle]
  const p = Math.max(0, Math.min(100, Math.round(pct)))
  const filled = Math.round((p * w) / 100)
  const cells: BarCell[] = []
  for (let i = 0; i < w; i++) {
    if (i < filled) {
      cells.push({
        ch: g.fill,
        color:
          c.barColorMode === 'solid'
            ? null
            : c.barColorMode === 'threshold'
              ? thresholdHex(p, c)
              : toHex(gradientRgb(i, w, c)),
      })
    } else {
      cells.push({ ch: g.empty, color: c.barColorMode === 'solid' ? null : '#6b6860' })
    }
  }
  return cells
}

/**
 * bash setup block for a bar segment. Variable names embed the config so
 * two bars with different settings never collide (the exporter dedupes
 * identical setup blocks).
 */
export function buildBarSetup(
  c: ElementConfig,
  source: string,
  keyBase: string,
): { setup: string[]; value: string } {
  const w = c.barWidth
  const g = BAR_GLYPHS[c.barStyle]
  const stops =
    c.barColorMode === 'solid'
      ? ''
      : `_${c.barLow.replace('#', '')}_${c.barMid.replace('#', '')}_${c.barHigh.replace('#', '')}`
  const key = `${keyBase}_${w}_${c.barStyle}_${c.barColorMode}${stops}`
  const v = `seg_bar_${key}`
  const p = `_p_${key}`
  const f = `_f_${key}`
  const lines: string[] = [
    `${p}=$(j '${source} // 0 | round')`,
    `(( ${p} < 0 )) && ${p}=0; (( ${p} > 100 )) && ${p}=100`,
    `${f}=$(( (${p} * ${w} + 50) / 100 ))`,
    `${v}=""`,
  ]
  if (c.barColorMode === 'solid') {
    lines.push(
      `for ((_i=0; _i<${w}; _i++)); do if (( _i < ${f} )); then ${v}+="${g.fill}"; else ${v}+="${g.empty}"; fi; done`,
    )
  } else if (c.barColorMode === 'threshold') {
    const cv = `_c_${key}`
    const escT = (hex: string) => {
      const [r, gg, b] = hexToRgb(hex)
      return `$'\\e[38;2;${r};${gg};${b}m'`
    }
    const escF = (hex: string) => `$'\\e[${nearestAnsiCode(hex)}m'`
    lines.push(
      `if (( USE_TRUECOLOR )); then`,
      `  if (( ${p} >= 80 )); then ${cv}=${escT(c.barHigh)}; elif (( ${p} >= 50 )); then ${cv}=${escT(c.barMid)}; else ${cv}=${escT(c.barLow)}; fi`,
      `else`,
      `  if (( ${p} >= 80 )); then ${cv}=${escF(c.barHigh)}; elif (( ${p} >= 50 )); then ${cv}=${escF(c.barMid)}; else ${cv}=${escF(c.barLow)}; fi`,
      `fi`,
      `for ((_i=0; _i<${w}; _i++)); do if (( _i < ${f} )); then ${v}+="\${${cv}}${g.fill}"; else ${v}+=$'\\e[90m'"${g.empty}"; fi; done`,
      `${v}+=$'\\e[0m'`,
    )
  } else {
    // gradient: per-cell 24-bit color across the low → mid → high stops;
    // without truecolor, degrade to a threshold-colored 16-color bar
    const [L, M, H] = [hexToRgb(c.barLow), hexToRgb(c.barMid), hexToRgb(c.barHigh)]
    const cv = `_c_${key}`
    const escF = (hex: string) => `$'\\e[${nearestAnsiCode(hex)}m'`
    const u = w > 1 ? `_i * 200 / ${w - 1}` : '0'
    const ch = (idx: number) =>
      `${['_r', '_g', '_b'][idx]}=$(( _u <= 100 ? ${L[idx]} + (${M[idx] - L[idx]}) * _u / 100 : ${M[idx]} + (${H[idx] - M[idx]}) * (_u - 100) / 100 ))`
    lines.push(
      `if (( USE_TRUECOLOR )); then`,
      `  for ((_i=0; _i<${w}; _i++)); do`,
      `    if (( _i < ${f} )); then`,
      `      _u=$(( ${u} ))`,
      `      ${ch(0)}; ${ch(1)}; ${ch(2)}`,
      `      ${v}+=$'\\e[38;2;'"\${_r};\${_g};\${_b}m${g.fill}"`,
      `    else ${v}+=$'\\e[90m'"${g.empty}"; fi`,
      `  done`,
      `else`,
      `  if (( ${p} >= 80 )); then ${cv}=${escF(c.barHigh)}; elif (( ${p} >= 50 )); then ${cv}=${escF(c.barMid)}; else ${cv}=${escF(c.barLow)}; fi`,
      `  for ((_i=0; _i<${w}; _i++)); do if (( _i < ${f} )); then ${v}+="\${${cv}}${g.fill}"; else ${v}+=$'\\e[90m'"${g.empty}"; fi; done`,
      `fi`,
      `${v}+=$'\\e[0m'`,
    )
  }
  return { setup: lines, value: `\${${v}}` }
}

export const BAR_SOURCES: Partial<Record<ElementType, { source: string; keyBase: string }>> = {
  'context-bar': { source: '.context_window.used_percentage', keyBase: 'ctx' },
  'rate-5h-bar': { source: '.rate_limits.five_hour.used_percentage', keyBase: 'r5' },
  'rate-7d-bar': { source: '.rate_limits.seven_day.used_percentage', keyBase: 'r7' },
}

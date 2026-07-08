import type { BarColorMode, BarStyle, ElementConfig, ElementType } from './types'

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

/** gradient color stops (matches the preview terminal theme) */
const G = [135, 192, 95] // green
const Y = [217, 168, 84] // yellow
const R = [224, 95, 95] // red

const lerp3 = (a: number[], b: number[], t: number) =>
  a.map((v, i) => Math.round(v + (b[i] - v) * t))

/** color of gradient cell i out of w (0-based), as [r,g,b] */
export function gradientRgb(i: number, w: number): number[] {
  const u = w > 1 ? (i * 200) / (w - 1) : 0
  return u <= 100 ? lerp3(G, Y, u / 100) : lerp3(Y, R, (u - 100) / 100)
}

const toHex = (rgb: number[]) =>
  '#' + rgb.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')

export const thresholdHex = (pct: number) =>
  pct >= 80 ? toHex(R) : pct >= 50 ? toHex(Y) : toHex(G)

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
              ? thresholdHex(p)
              : toHex(gradientRgb(i, w)),
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
  const key = `${keyBase}_${w}_${c.barStyle}_${c.barColorMode}`
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
    lines.push(
      `if (( ${p} >= 80 )); then ${cv}=$'\\e[31m'; elif (( ${p} >= 50 )); then ${cv}=$'\\e[33m'; else ${cv}=$'\\e[32m'; fi`,
      `for ((_i=0; _i<${w}; _i++)); do if (( _i < ${f} )); then ${v}+="\${${cv}}${g.fill}"; else ${v}+=$'\\e[90m'"${g.empty}"; fi; done`,
      `${v}+=$'\\e[0m'`,
    )
  } else {
    // gradient: per-cell 24-bit color, green → yellow → red across the width
    const u = w > 1 ? `_i * 200 / ${w - 1}` : '0'
    lines.push(
      `for ((_i=0; _i<${w}; _i++)); do`,
      `  if (( _i < ${f} )); then`,
      `    _u=$(( ${u} ))`,
      `    if (( _u <= 100 )); then _r=$(( 135 + 82 * _u / 100 )); _g=$(( 192 - 24 * _u / 100 )); _b=$(( 95 - 11 * _u / 100 ))`,
      `    else _r=$(( 217 + 7 * (_u - 100) / 100 )); _g=$(( 168 - 73 * (_u - 100) / 100 )); _b=$(( 84 + 11 * (_u - 100) / 100 )); fi`,
      `    ${v}+=$'\\e[38;2;'"\${_r};\${_g};\${_b}m${g.fill}"`,
      `  else ${v}+=$'\\e[90m'"${g.empty}"; fi`,
      `done`,
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

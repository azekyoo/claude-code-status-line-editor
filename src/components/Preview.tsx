import type { ElementInstance } from '../types'
import { ELEMENT_DEFS } from '../elements'
import { ANSI_HEX, configHex, MOCK } from '../mock'
import { BAR_TYPES, barCells, gradientRgb } from '../bar'
import { NO_TEXT_GRADIENT } from '../exporter'

// read at render time so mock data edits show live
const barMockPct = (type: string): number =>
  type === 'context-bar'
    ? MOCK.context_window.used_percentage
    : type === 'rate-5h-bar'
      ? MOCK.rate_limits.five_hour.used_percentage
      : MOCK.rate_limits.seven_day.used_percentage

function Segment({ el }: { el: ElementInstance }) {
  const def = ELEMENT_DEFS[el.type]
  const style: React.CSSProperties = {
    color: configHex(el.config),
    fontWeight: el.config.bold ? 700 : 400,
    opacity: el.config.dim ? 0.55 : 1,
  }
  if (BAR_TYPES.has(el.type)) {
    const cells = barCells(barMockPct(el.type), el.config)
    return (
      <span style={style}>
        {el.config.prefix}
        {cells.map((cell, i) => (
          <span key={i} style={cell.color ? { color: cell.color } : undefined}>
            {cell.ch}
          </span>
        ))}
        {el.config.suffix}
      </span>
    )
  }
  if (el.type === 'lines-changed') {
    return (
      <span style={{ opacity: el.config.dim ? 0.55 : 1 }}>
        {el.config.prefix}
        <span style={{ color: ANSI_HEX.green }}>+{MOCK.cost.total_lines_added}</span>{' '}
        <span style={{ color: ANSI_HEX.red }}>-{MOCK.cost.total_lines_removed}</span>
        {el.config.suffix}
      </span>
    )
  }
  if (el.config.color === 'gradient' && !NO_TEXT_GRADIENT.has(el.type)) {
    const text = el.config.prefix + def.preview(el.config) + el.config.suffix
    const chars = [...text]
    return (
      <span style={{ ...style, color: undefined }}>
        {chars.map((ch, i) => {
          const [r, g, b] = gradientRgb(i, chars.length, el.config)
          return (
            <span key={i} style={{ color: `rgb(${r},${g},${b})` }}>
              {ch}
            </span>
          )
        })}
      </span>
    )
  }
  return (
    <span style={style}>
      {el.config.prefix}
      {def.preview(el.config)}
      {el.config.suffix}
    </span>
  )
}

/** bare rendered status line rows — used by the terminal preview and preset cards */
export function StatusRows({ rows, emptyHint }: { rows: ElementInstance[][]; emptyHint?: string }) {
  return (
    <div className="statusline">
      {rows.map((row, i) => (
        <div className="statusline-row" key={i}>
          {row.length === 0 && emptyHint ? (
            <span className="statusline-empty">{emptyHint}</span>
          ) : (
            row.map((el) => <Segment el={el} key={el.id} />)
          )}
        </div>
      ))}
    </div>
  )
}

export default function Preview({ rows }: { rows: ElementInstance[][] }) {
  return (
    <div className="terminal">
      <div className="terminal-titlebar">
        <span className="tl-dot" />
        <span className="tl-dot" />
        <span className="tl-dot" />
        <span className="terminal-title">
          dev@local: {MOCK.workspace.current_dir.replace(/^\/(home|Users)\/[^/]+/, '~')}
        </span>
      </div>
      <div className="terminal-body">
        <div className="term-history">
          <div className="term-msg-user">&gt; make the status line beautiful</div>
          <div className="term-msg-claude">
            <span className="claude-dot">●</span> Done. Behold your new status line below.
          </div>
        </div>
        <div className="term-inputbox">
          <span className="term-prompt">&gt;&nbsp;</span>
          <span className="term-caret" />
        </div>
        <StatusRows rows={rows} emptyHint="‹ empty line — drop elements here ›" />
      </div>
      <div className="terminal-scanlines" aria-hidden />
    </div>
  )
}

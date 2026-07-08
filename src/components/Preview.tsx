import type { ElementInstance } from '../types'
import { ELEMENT_DEFS } from '../elements'
import { ANSI_HEX } from '../mock'
import { MOCK } from '../mock'
import { BAR_TYPES, barCells } from '../bar'

const BAR_MOCK_PCT: Record<string, number> = {
  'context-bar': MOCK.context_window.used_percentage,
  'rate-5h-bar': MOCK.rate_limits.five_hour.used_percentage,
  'rate-7d-bar': MOCK.rate_limits.seven_day.used_percentage,
}

function Segment({ el }: { el: ElementInstance }) {
  const def = ELEMENT_DEFS[el.type]
  const style: React.CSSProperties = {
    color: ANSI_HEX[el.config.color],
    fontWeight: el.config.bold ? 700 : 400,
    opacity: el.config.dim ? 0.55 : 1,
  }
  if (BAR_TYPES.has(el.type)) {
    const cells = barCells(BAR_MOCK_PCT[el.type] ?? 0, el.config)
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
  return (
    <span style={style}>
      {el.config.prefix}
      {def.preview(el.config)}
      {el.config.suffix}
    </span>
  )
}

export default function Preview({ rows }: { rows: ElementInstance[][] }) {
  return (
    <div className="terminal">
      <div className="terminal-titlebar">
        <span className="tl-dot" />
        <span className="tl-dot" />
        <span className="tl-dot" />
        <span className="terminal-title">gaspard@dev: ~/projects/statusline-editor</span>
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
        <div className="statusline">
          {rows.map((row, i) => (
            <div className="statusline-row" key={i}>
              {row.length === 0 ? (
                <span className="statusline-empty">‹ empty line — drop elements here ›</span>
              ) : (
                row.map((el) => <Segment el={el} key={el.id} />)
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="terminal-scanlines" aria-hidden />
    </div>
  )
}

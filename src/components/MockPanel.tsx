import { useReducer, useState } from 'react'
import { MOCK, resetMock, saveMock } from '../mock'

/** Editable fake payload — stress-test a design against long paths, 95%
 *  context, huge costs… Mutates MOCK in place and notifies App to re-render. */
export default function MockPanel({ onChange }: { onChange: () => void }) {
  const [open, setOpen] = useState(false)
  const [, bump] = useReducer((x: number) => x + 1, 0)

  const edit = (fn: () => void) => {
    fn()
    saveMock()
    bump()
    onChange()
  }

  const text = (label: string, get: () => string, set: (v: string) => void) => (
    <label className="mock-field">
      <span className="field-label">{label}</span>
      <input className="field-input" value={get()} onChange={(e) => edit(() => set(e.target.value))} />
    </label>
  )

  const num = (label: string, get: () => number, set: (v: number) => void, step = 1) => (
    <label className="mock-field">
      <span className="field-label">{label}</span>
      <input
        className="field-input"
        type="number"
        min={0}
        step={step}
        value={get()}
        onChange={(e) => edit(() => set(Math.max(0, Number(e.target.value) || 0)))}
      />
    </label>
  )

  const pct = (label: string, get: () => number, set: (v: number) => void) => (
    <label className="mock-field">
      <span className="field-label">
        {label} — {Math.round(get())}%
      </span>
      <input
        className="field-range"
        type="range"
        min={0}
        max={100}
        value={Math.round(get())}
        onChange={(e) => edit(() => set(Number(e.target.value)))}
      />
    </label>
  )

  return (
    <section className="export">
      <div className="export-bar">
        <button className="export-toggle" onClick={() => setOpen((o) => !o)}>
          {open ? '▾' : '▸'} mock data
        </button>
        {open && (
          <button className="ghost-btn" onClick={() => edit(resetMock)}>
            reset mock
          </button>
        )}
      </div>
      {open && (
        <div className="mock-body">
          {text(
            'Model',
            () => MOCK.model.display_name,
            (v) => (MOCK.model.display_name = v),
          )}
          {text(
            'Directory',
            () => MOCK.workspace.current_dir,
            (v) => {
              MOCK.workspace.current_dir = v
              MOCK.workspace.project_dir = v
            },
          )}
          {text(
            'Git branch',
            () => MOCK.gitBranch,
            (v) => (MOCK.gitBranch = v),
          )}
          {text(
            'Session name',
            () => MOCK.session_name,
            (v) => (MOCK.session_name = v),
          )}
          {num(
            'Cost $',
            () => MOCK.cost.total_cost_usd,
            (v) => (MOCK.cost.total_cost_usd = v),
            0.01,
          )}
          {num(
            'Duration (min)',
            () => Math.round(MOCK.cost.total_duration_ms / 60000),
            (v) => (MOCK.cost.total_duration_ms = v * 60000),
          )}
          {num(
            'Lines +',
            () => MOCK.cost.total_lines_added,
            (v) => (MOCK.cost.total_lines_added = v),
          )}
          {num(
            'Lines −',
            () => MOCK.cost.total_lines_removed,
            (v) => (MOCK.cost.total_lines_removed = v),
          )}
          {num(
            'Tokens',
            () => MOCK.context_window.total_input_tokens,
            (v) => (MOCK.context_window.total_input_tokens = v),
            500,
          )}
          {pct(
            'Context used',
            () => MOCK.context_window.used_percentage,
            (v) => {
              MOCK.context_window.used_percentage = v
              MOCK.context_window.remaining_percentage = 100 - v
            },
          )}
          {pct(
            '5h window',
            () => MOCK.rate_limits.five_hour.used_percentage,
            (v) => (MOCK.rate_limits.five_hour.used_percentage = v),
          )}
          {pct(
            '7d window',
            () => MOCK.rate_limits.seven_day.used_percentage,
            (v) => (MOCK.rate_limits.seven_day.used_percentage = v),
          )}
        </div>
      )}
    </section>
  )
}

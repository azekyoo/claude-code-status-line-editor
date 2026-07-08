import type { AnsiColor, ElementConfig, ElementInstance } from '../types'
import { ELEMENT_DEFS, SEP_GLYPHS } from '../elements'
import { ANSI_HEX, ANSI_ORDER } from '../mock'

export default function Inspector({
  el,
  onChange,
  onRemove,
}: {
  el: ElementInstance | null
  onChange: (id: string, patch: Partial<ElementConfig>) => void
  onRemove: (id: string) => void
}) {
  if (!el) {
    return (
      <aside className="inspector" onClick={(e) => e.stopPropagation()}>
        <h2 className="panel-title">Inspector</h2>
        <p className="panel-sub">select a chip to edit it</p>
        <div className="inspector-empty">∅</div>
      </aside>
    )
  }
  const def = ELEMENT_DEFS[el.type]
  const set = (patch: Partial<ElementConfig>) => onChange(el.id, patch)
  const hasContent = el.type === 'text' || el.type === 'sep'

  return (
    <aside className="inspector" onClick={(e) => e.stopPropagation()}>
      <h2 className="panel-title">Inspector</h2>
      <p className="panel-sub">{def.label} — {def.hint}</p>

      {hasContent && (
        <div className="field">
          <label className="field-label">{el.type === 'sep' ? 'Glyph' : 'Content'}</label>
          <input
            className="field-input"
            value={el.config.extra}
            onChange={(e) => set({ extra: e.target.value })}
          />
          {el.type === 'sep' && (
            <div className="glyph-row">
              {SEP_GLYPHS.map((g) => (
                <button
                  key={g}
                  className={`glyph-btn${el.config.extra === g ? ' active' : ''}`}
                  onClick={() => set({ extra: g })}
                >
                  {g === ' ' ? '␣' : g}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="field">
        <label className="field-label">Color</label>
        <div className="color-grid">
          {ANSI_ORDER.map((c: AnsiColor) => (
            <button
              key={c}
              className={`color-cell${el.config.color === c ? ' active' : ''}`}
              style={{ background: ANSI_HEX[c] }}
              onClick={() => set({ color: c })}
              title={c}
            />
          ))}
        </div>
        <span className="color-name">{el.config.color}</span>
      </div>

      <div className="field field-inline">
        <button
          className={`toggle${el.config.bold ? ' on' : ''}`}
          onClick={() => set({ bold: !el.config.bold })}
        >
          <b>B</b> bold
        </button>
        <button
          className={`toggle${el.config.dim ? ' on' : ''}`}
          onClick={() => set({ dim: !el.config.dim })}
        >
          <span style={{ opacity: 0.5 }}>D</span> dim
        </button>
      </div>

      <div className="field">
        <label className="field-label">Prefix</label>
        <input
          className="field-input"
          value={el.config.prefix}
          placeholder="e.g.  or [ "
          onChange={(e) => set({ prefix: e.target.value })}
        />
      </div>
      <div className="field">
        <label className="field-label">Suffix</label>
        <input
          className="field-input"
          value={el.config.suffix}
          placeholder="e.g. ] or %"
          onChange={(e) => set({ suffix: e.target.value })}
        />
      </div>

      <button className="danger-btn" onClick={() => onRemove(el.id)}>
        remove element
      </button>
    </aside>
  )
}

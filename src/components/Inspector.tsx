import type { AnsiColor, ElementConfig, ElementInstance } from '../types'
import { ELEMENT_DEFS, SEP_GLYPHS } from '../elements'
import { ANSI_HEX, ANSI_ORDER } from '../mock'
import { BAR_COLOR_MODES, BAR_GLYPHS, BAR_STYLES, BAR_TYPES } from '../bar'

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
  const isBar = BAR_TYPES.has(el.type)

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

      {isBar && (
        <>
          <div className="field">
            <label className="field-label">Bar style</label>
            <div className="bar-style-list">
              {BAR_STYLES.map((s) => (
                <button
                  key={s}
                  className={`bar-style-btn${el.config.barStyle === s ? ' active' : ''}`}
                  onClick={() => set({ barStyle: s })}
                  title={s}
                >
                  {BAR_GLYPHS[s].fill.repeat(3) + BAR_GLYPHS[s].empty.repeat(2)}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label className="field-label">Width — {el.config.barWidth} cells</label>
            <input
              type="range"
              min={4}
              max={30}
              value={el.config.barWidth}
              className="field-range"
              onChange={(e) => set({ barWidth: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label className="field-label">Fill color</label>
            <div className="field-inline">
              {BAR_COLOR_MODES.map((m) => (
                <button
                  key={m.key}
                  className={`toggle${el.config.barColorMode === m.key ? ' on' : ''}`}
                  onClick={() => set({ barColorMode: m.key })}
                  title={m.hint}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <span className="color-name">
              {BAR_COLOR_MODES.find((m) => m.key === el.config.barColorMode)?.hint}
            </span>
          </div>
          {el.config.barColorMode !== 'solid' && (
            <div className="field">
              <label className="field-label">
                {el.config.barColorMode === 'threshold' ? 'Threshold colors' : 'Gradient stops'}
              </label>
              <div className="stop-row">
                {(
                  [
                    ['barLow', el.config.barColorMode === 'threshold' ? '< 50%' : 'start'],
                    ['barMid', el.config.barColorMode === 'threshold' ? '50–79%' : 'middle'],
                    ['barHigh', el.config.barColorMode === 'threshold' ? '≥ 80%' : 'end'],
                  ] as const
                ).map(([k, label]) => (
                  <label key={k} className="stop-item">
                    <input
                      type="color"
                      className="stop-input"
                      value={el.config[k]}
                      onChange={(e) => set({ [k]: e.target.value })}
                    />
                    <span className="stop-label">{label}</span>
                  </label>
                ))}
              </div>
              {el.config.barColorMode === 'gradient' && (
                <div
                  className="stop-preview"
                  style={{
                    background: `linear-gradient(to right, ${el.config.barLow}, ${el.config.barMid}, ${el.config.barHigh})`,
                  }}
                />
              )}
            </div>
          )}
        </>
      )}

      <div className="field">
        <label className="field-label">
          {isBar
            ? el.config.barColorMode === 'solid'
              ? 'Color (fill + prefix/suffix)'
              : 'Color (prefix/suffix only)'
            : 'Color'}
        </label>
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
          <label
            className={`color-cell color-cell-custom${el.config.color === 'custom' ? ' active' : ''}`}
            style={el.config.color === 'custom' ? { background: el.config.customColor } : undefined}
            title="custom color"
          >
            <input
              type="color"
              className="color-cell-input"
              value={el.config.customColor}
              onClick={() => set({ color: 'custom' })}
              onChange={(e) => set({ color: 'custom', customColor: e.target.value })}
            />
          </label>
        </div>
        <span className="color-name">
          {el.config.color === 'custom' ? `custom ${el.config.customColor}` : el.config.color}
        </span>
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

import { useEffect, useState } from 'react'
import type { AnsiColor, ElementConfig, ElementInstance } from '../types'
import { ELEMENT_DEFS, NERD_SEP_GLYPHS, PREFIX_ICONS, SEP_GLYPHS } from '../elements'
import { ANSI_HEX, ANSI_ORDER } from '../mock'
import { BAR_COLOR_MODES, BAR_GLYPHS, BAR_STYLES, BAR_TYPES } from '../bar'
import { NO_TEXT_GRADIENT } from '../exporter'
import ColorPopover from './ColorPopover'

type PickKey = 'customColor' | 'barLow' | 'barMid' | 'barHigh'
type PickerState = { key: PickKey; x: number; y: number } | null

function StopsEditor({
  el,
  labels,
  showRamp,
  onPick,
}: {
  el: ElementInstance
  labels: [string, string, string]
  showRamp: boolean
  onPick: (key: PickKey, e: React.MouseEvent) => void
}) {
  const keys = ['barLow', 'barMid', 'barHigh'] as const
  return (
    <>
      <div className="stop-row">
        {keys.map((k, i) => (
          <div key={k} className="stop-item">
            <button
              className="stop-input"
              style={{ background: el.config[k] }}
              onClick={(e) => onPick(k, e)}
              title={el.config[k]}
            />
            <span className="stop-label">{labels[i]}</span>
          </div>
        ))}
      </div>
      {showRamp && (
        <div
          className="stop-preview"
          style={{
            background: `linear-gradient(to right, ${el.config.barLow}, ${el.config.barMid}, ${el.config.barHigh})`,
          }}
        />
      )}
    </>
  )
}

export default function Inspector({
  el,
  onChange,
  onRemove,
  onClose,
}: {
  el: ElementInstance | null
  onChange: (id: string, patch: Partial<ElementConfig>) => void
  onRemove: (id: string) => void
  onClose: () => void
}) {
  const [picker, setPicker] = useState<PickerState>(null)
  const elId = el?.id
  useEffect(() => setPicker(null), [elId])
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
  const canTextGradient = !NO_TEXT_GRADIENT.has(el.type)
  const isTextGradient = canTextGradient && el.config.color === 'gradient'
  const openPicker = (key: PickKey, e: React.MouseEvent) =>
    setPicker({ key, x: e.clientX, y: e.clientY })

  return (
    <aside className="inspector has-selection" onClick={(e) => e.stopPropagation()}>
      <button className="inspector-close" onClick={onClose} title="close inspector">
        done ✓
      </button>
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
            <>
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
              <div className="glyph-row">
                {NERD_SEP_GLYPHS.map((g) => (
                  <button
                    key={g}
                    className={`glyph-btn nerd${el.config.extra === g ? ' active' : ''}`}
                    onClick={() => set({ extra: g })}
                    title="requires a Nerd Font in your terminal"
                  >
                    {g}
                  </button>
                ))}
              </div>
              <span className="color-name">bottom row needs a Nerd Font in your terminal</span>
            </>
          )}
        </div>
      )}

      {el.type === 'lines-changed' && (
        <div className="field">
          <label className="field-label">Diff source</label>
          <div className="field-inline">
            <button
              className={`toggle${el.config.extra !== 'session' ? ' on' : ''}`}
              onClick={() => set({ extra: 'repo' })}
              title="uncommitted changes vs HEAD"
            >
              git repo
            </button>
            <button
              className={`toggle${el.config.extra === 'session' ? ' on' : ''}`}
              onClick={() => set({ extra: 'session' })}
              title="lines Claude changed this session"
            >
              session
            </button>
          </div>
          <span className="color-name">
            {el.config.extra === 'session'
              ? 'lines Claude changed this session'
              : 'uncommitted diff vs HEAD — hidden when clean or outside a repo'}
          </span>
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
              <StopsEditor
                el={el}
                labels={
                  el.config.barColorMode === 'threshold'
                    ? ['< 50%', '50–79%', '≥ 80%']
                    : ['start', 'middle', 'end']
                }
                showRamp={el.config.barColorMode === 'gradient'}
                onPick={openPicker}
              />
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
        {canTextGradient && (
          <div className="field-inline mode-row">
            <button
              className={`toggle${!isTextGradient ? ' on' : ''}`}
              onClick={() => el.config.color === 'gradient' && set({ color: 'default' })}
              title="single color"
            >
              solid
            </button>
            <button
              className={`toggle${isTextGradient ? ' on' : ''}`}
              onClick={() => set({ color: 'gradient' })}
              title="per-character ramp across the text (truecolor)"
            >
              gradient
            </button>
          </div>
        )}
        {isTextGradient ? (
          <>
            <StopsEditor el={el} labels={['start', 'middle', 'end']} showRamp onPick={openPicker} />
            <span className="color-name">gradient across text (truecolor)</span>
          </>
        ) : (
          <>
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
              <button
                className={`color-cell color-cell-custom${el.config.color === 'custom' ? ' active' : ''}`}
                style={
                  el.config.color === 'custom' ? { background: el.config.customColor } : undefined
                }
                title="custom color"
                onClick={(e) => {
                  set({ color: 'custom' })
                  openPicker('customColor', e)
                }}
              />
            </div>
            <span className="color-name">
              {el.config.color === 'custom' ? `custom ${el.config.customColor}` : el.config.color}
            </span>
          </>
        )}
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
        <div className="glyph-row">
          {PREFIX_ICONS.map((g) => (
            <button
              key={g}
              className={`glyph-btn nerd${el.config.prefix === g + ' ' ? ' active' : ''}`}
              onClick={() => set({ prefix: g + ' ' })}
              title="Nerd Font icon — requires a Nerd Font in your terminal"
            >
              {g}
            </button>
          ))}
        </div>
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

      {picker && (
        <ColorPopover
          x={picker.x}
          y={picker.y}
          value={el.config[picker.key]}
          onChange={(hex) => set({ [picker.key]: hex })}
          onClose={() => setPicker(null)}
        />
      )}
    </aside>
  )
}

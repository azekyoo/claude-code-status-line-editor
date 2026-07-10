import { useEffect, useMemo, useState } from 'react'
import type { ElementInstance } from '../types'
import { PRESETS } from '../presets'
import { deleteDesign, listDesigns, saveDesign, type SavedDesign } from '../designs'
import { fromWire } from '../share'
import { StatusRows } from './Preview'

function DesignCard({
  design,
  onApply,
  onDelete,
}: {
  design: SavedDesign
  onApply: (rows: ElementInstance[][]) => void
  onDelete: (id: string) => void
}) {
  const rows = useMemo(() => fromWire(design.wire), [design.wire])
  if (!rows) return null
  return (
    <div className="preset-card design-card">
      <button className="design-card-main" onClick={() => onApply(fromWire(design.wire)!)}>
        <div className="preset-strip">
          <StatusRows rows={rows} emptyHint="‹ empty line ›" />
        </div>
        <div className="preset-name">{design.name}</div>
        <div className="preset-desc">saved {new Date(design.savedAt).toLocaleDateString()}</div>
      </button>
      <button
        className="design-delete"
        title="delete this design"
        onClick={() => {
          if (window.confirm(`Delete "${design.name}"?`)) onDelete(design.id)
        }}
      >
        ×
      </button>
    </div>
  )
}

export default function PresetGallery({
  currentRows,
  onApply,
  onClose,
}: {
  currentRows: ElementInstance[][]
  onApply: (rows: ElementInstance[][]) => void
  onClose: () => void
}) {
  // build each preset once per open so card previews have stable ids
  const built = useMemo(() => PRESETS.map((p) => ({ ...p, rows: p.build() })), [])
  const [designs, setDesigns] = useState<SavedDesign[]>(listDesigns)
  const [name, setName] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = () => {
    if (!name.trim()) return
    setDesigns(saveDesign(name, currentRows))
    setName('')
  }

  return (
    <div className="preset-overlay" onClick={onClose}>
      <div className="preset-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preset-head">
          <div>
            <h2 className="panel-title">Presets</h2>
            <p className="panel-sub">pick a starting point — everything stays editable</p>
          </div>
          <button className="ghost-btn" onClick={onClose}>
            close ✕
          </button>
        </div>

        <div className="design-save-row">
          <input
            className="field-input"
            placeholder="name the current design…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          <button className="accent-btn" onClick={save} disabled={!name.trim()}>
            save current
          </button>
        </div>

        {designs.length > 0 && (
          <>
            <h3 className="palette-cat preset-section-title">My designs</h3>
            <div className="preset-grid">
              {designs.map((d) => (
                <DesignCard
                  key={d.id}
                  design={d}
                  onApply={onApply}
                  onDelete={(id) => setDesigns(deleteDesign(id))}
                />
              ))}
            </div>
          </>
        )}

        <h3 className="palette-cat preset-section-title">Templates</h3>
        <div className="preset-grid">
          {built.map((p) => (
            <button key={p.id} className="preset-card" onClick={() => onApply(p.build())}>
              <div className="preset-strip">
                <StatusRows rows={p.rows} />
              </div>
              <div className="preset-name">{p.name}</div>
              <div className="preset-desc">{p.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

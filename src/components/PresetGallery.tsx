import { useEffect, useMemo } from 'react'
import type { ElementInstance } from '../types'
import { PRESETS } from '../presets'
import { StatusRows } from './Preview'

export default function PresetGallery({
  onApply,
  onClose,
}: {
  onApply: (rows: ElementInstance[][]) => void
  onClose: () => void
}) {
  // build each preset once per open so card previews have stable ids
  const built = useMemo(() => PRESETS.map((p) => ({ ...p, rows: p.build() })), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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

import { useEffect, useRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { ElementType } from '../types'
import { CATEGORIES, ELEMENT_DEFS } from '../elements'
import { ANSI_HEX } from '../mock'

function PaletteItem({ type, onAdd }: { type: ElementType; onAdd: (t: ElementType) => void }) {
  const def = ELEMENT_DEFS[type]
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${type}`,
  })
  // the browser fires a click after a drag's pointerup on the same element;
  // without this guard a drag-drop would insert the element twice
  const dragged = useRef(false)
  useEffect(() => {
    if (isDragging) dragged.current = true
  }, [isDragging])
  const handleClick = () => {
    if (dragged.current) {
      dragged.current = false
      return
    }
    onAdd(type)
  }
  const dc = def.defaults.color
  const accent = ANSI_HEX[dc && dc !== 'custom' ? dc : 'default']
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`palette-item${isDragging ? ' dragging' : ''}`}
      onClick={handleClick}
      title={`${def.hint} — click or drag to add`}
    >
      <span className="palette-swatch" style={{ background: accent }} />
      <span className="palette-label">{def.label}</span>
      <span className="palette-plus">+</span>
    </button>
  )
}

export default function Palette({ onAdd }: { onAdd: (t: ElementType) => void }) {
  return (
    <aside className="palette" onClick={(e) => e.stopPropagation()}>
      <h2 className="panel-title">Elements</h2>
      <p className="panel-sub">click or drag onto a line</p>
      {CATEGORIES.map((cat) => (
        <section key={cat.key} className="palette-section">
          <h3 className="palette-cat">{cat.title}</h3>
          <div className="palette-grid">
            {Object.values(ELEMENT_DEFS)
              .filter((d) => d.category === cat.key)
              .map((d) => (
                <PaletteItem key={d.type} type={d.type} onAdd={onAdd} />
              ))}
          </div>
        </section>
      ))}
    </aside>
  )
}

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ElementInstance } from '../types'
import { ELEMENT_DEFS } from '../elements'
import { configHex } from '../mock'

export function Chip({
  el,
  selected,
  onSelect,
  onRemove,
}: {
  el: ElementInstance
  selected: boolean
  onSelect: (id: string) => void
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: el.id,
  })
  const def = ELEMENT_DEFS[el.type]
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }
  const isGlyph = el.type === 'text' || el.type === 'sep'
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`chip${selected ? ' selected' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(el.id)
      }}
      {...attributes}
      {...listeners}
    >
      <span
        className="chip-swatch"
        style={{
          background:
            el.config.color === 'gradient'
              ? `linear-gradient(90deg, ${el.config.barLow}, ${el.config.barMid}, ${el.config.barHigh})`
              : configHex(el.config),
        }}
      />
      <span className="chip-label">{isGlyph ? el.config.extra || def.label : def.label}</span>
      <button
        className="chip-x"
        onClick={(e) => {
          e.stopPropagation()
          onRemove(el.id)
        }}
        onPointerDown={(e) => e.stopPropagation()}
        title="remove"
      >
        ×
      </button>
    </div>
  )
}

export function Row({
  index,
  row,
  selectedId,
  onSelect,
  onRemove,
  onRemoveRow,
  canRemoveRow,
}: {
  index: number
  row: ElementInstance[]
  selectedId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onRemoveRow: (index: number) => void
  canRemoveRow: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `row:${index}` })
  return (
    <div className="canvas-row-wrap">
      <span className="canvas-row-num">{index + 1}</span>
      <SortableContext items={row.map((e) => e.id)} strategy={horizontalListSortingStrategy}>
        <div ref={setNodeRef} className={`canvas-row${isOver ? ' over' : ''}`}>
          {row.length === 0 && <span className="canvas-row-hint">drop elements here</span>}
          {row.map((el) => (
            <Chip
              key={el.id}
              el={el}
              selected={el.id === selectedId}
              onSelect={onSelect}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
      {canRemoveRow && (
        <button className="row-x" onClick={() => onRemoveRow(index)} title="delete line">
          ×
        </button>
      )}
    </div>
  )
}

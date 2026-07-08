import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import type { ElementConfig, ElementInstance, ElementType } from './types'
import { ELEMENT_DEFS, makeInstance } from './elements'
import Palette from './components/Palette'
import Preview from './components/Preview'
import Inspector from './components/Inspector'
import ExportPanel from './components/ExportPanel'
import { Row } from './components/Canvas'

function defaultRows(): ElementInstance[][] {
  const sep1 = makeInstance('sep')
  const sep2 = makeInstance('sep')
  return [
    [
      makeInstance('model'),
      sep1,
      makeInstance('cwd-basename'),
      makeInstance('git-branch'),
      sep2,
      makeInstance('context-pct'),
      makeInstance('cost'),
    ],
  ]
}

export default function App() {
  const [rows, setRows] = useState<ElementInstance[][]>(defaultRows)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const selected = useMemo(
    () => rows.flat().find((e) => e.id === selectedId) ?? null,
    [rows, selectedId],
  )

  const locate = (id: string, rs: ElementInstance[][]): [number, number] | null => {
    for (let r = 0; r < rs.length; r++) {
      const c = rs[r].findIndex((e) => e.id === id)
      if (c !== -1) return [r, c]
    }
    return null
  }

  const addElement = (type: ElementType, rowIndex?: number, at?: number) => {
    const el = makeInstance(type)
    setRows((rs) => {
      const next = rs.map((r) => [...r])
      const r = rowIndex ?? next.length - 1
      const row = next[Math.min(r, next.length - 1)]
      row.splice(at ?? row.length, 0, el)
      return next
    })
    setSelectedId(el.id)
  }

  const removeElement = (id: string) => {
    setRows((rs) => rs.map((r) => r.filter((e) => e.id !== id)))
    if (selectedId === id) setSelectedId(null)
  }

  const patchElement = (id: string, patch: Partial<ElementConfig>) => {
    setRows((rs) =>
      rs.map((r) => r.map((e) => (e.id === id ? { ...e, config: { ...e.config, ...patch } } : e))),
    )
  }

  const addRow = () => setRows((rs) => [...rs, []])
  const removeRow = (i: number) => {
    if (rows.length <= 1) return
    if (selectedId && rows[i]?.some((e) => e.id === selectedId)) setSelectedId(null)
    setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs))
  }

  const onDragStart = (e: DragStartEvent) => setDragging(String(e.active.id))

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null)
    const { active, over } = e
    if (!over) return
    const aid = String(active.id)
    const oid = String(over.id)

    // resolve drop target → [row, index]
    const resolveTarget = (rs: ElementInstance[][]): [number, number] | null => {
      if (oid.startsWith('row:')) {
        const r = Number(oid.slice(4))
        return r < rs.length ? [r, rs[r].length] : null
      }
      return locate(oid, rs)
    }

    if (aid.startsWith('palette:')) {
      const type = aid.slice(8) as ElementType
      const t = resolveTarget(rows)
      if (!t) return
      const el = makeInstance(type)
      setRows((rs) => {
        const next = rs.map((r) => [...r])
        next[t[0]].splice(Math.min(t[1], next[t[0]].length), 0, el)
        return next
      })
      setSelectedId(el.id)
      return
    }

    if (aid === oid) return
    setRows((rs) => {
      const from = locate(aid, rs)
      const to = resolveTarget(rs)
      if (!from || !to) return rs
      if (from[0] === to[0]) {
        const next = rs.map((r) => [...r])
        next[from[0]] = arrayMove(next[from[0]], from[1], Math.min(to[1], next[from[0]].length - 1))
        return next
      }
      const next = rs.map((r) => [...r])
      const [el] = next[from[0]].splice(from[1], 1)
      next[to[0]].splice(Math.min(to[1], next[to[0]].length), 0, el)
      return next
    })
  }

  const dragLabel = useMemo(() => {
    if (!dragging) return null
    if (dragging.startsWith('palette:'))
      return ELEMENT_DEFS[dragging.slice(8) as ElementType]?.label ?? null
    const el = rows.flat().find((e) => e.id === dragging)
    return el ? ELEMENT_DEFS[el.type].label : null
  }, [dragging, rows])

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1 className="brand">
            Claude Code <em>Statusline Editor</em>
          </h1>
          <p className="brand-sub">drag · style · export statusline.sh</p>
        </div>
        <div className="header-meta">stdin JSON → jq → ANSI → your terminal</div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <main className="main" onClick={() => setSelectedId(null)}>
          <Palette onAdd={(t) => addElement(t)} />

          <div className="center" onClick={(e) => e.stopPropagation()}>
            <Preview rows={rows} />

            <section className="canvas">
              <div className="canvas-head">
                <h2 className="panel-title">Lines</h2>
                <button className="ghost-btn" onClick={addRow}>
                  + add line
                </button>
              </div>
              {rows.map((row, i) => (
                <Row
                  key={i}
                  index={i}
                  row={row}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onRemove={removeElement}
                  onRemoveRow={removeRow}
                  canRemoveRow={rows.length > 1}
                />
              ))}
            </section>

            <ExportPanel doc={{ rows }} />
          </div>

          <Inspector el={selected} onChange={patchElement} onRemove={removeElement} />
        </main>

        <DragOverlay>
          {dragLabel ? <div className="chip drag-overlay">{dragLabel}</div> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

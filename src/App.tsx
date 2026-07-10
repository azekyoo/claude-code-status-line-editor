import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
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
import { DEFAULT_CONFIG, ELEMENT_DEFS, makeInstance, seedIdCounter } from './elements'
import { docFromHash } from './share'
import { loadMock } from './mock'
import logoUrl from './assets/logo.png'
import Palette from './components/Palette'
import Preview from './components/Preview'
import Inspector from './components/Inspector'
import ExportPanel from './components/ExportPanel'
import MockPanel from './components/MockPanel'
import { Row } from './components/Canvas'

loadMock()

const STORAGE_KEY = 'ccse-doc-v1'

/** restore the saved document; tolerates unknown types and missing config
 *  fields from older versions (merged over DEFAULT_CONFIG) */
function loadRows(): ElementInstance[][] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    let maxId = 0
    const rows = parsed.map((row) =>
      (Array.isArray(row) ? row : [])
        .filter(
          (e): e is ElementInstance =>
            !!e && typeof e === 'object' && (e as ElementInstance).type in ELEMENT_DEFS,
        )
        .map((e) => {
          const m = /^el-(\d+)-/.exec(typeof e.id === 'string' ? e.id : '')
          if (m) maxId = Math.max(maxId, Number(m[1]))
          const id = m ? e.id : `el-${++maxId}-${e.type}`
          return { id, type: e.type, config: { ...DEFAULT_CONFIG, ...(e.config ?? {}) } }
        }),
    )
    seedIdCounter(maxId)
    return rows.some((r) => r.length > 0) ? rows : null
  } catch {
    return null
  }
}

function defaultRows(): ElementInstance[][] {
  const sep = () => {
    const s = makeInstance('sep')
    s.config.prefix = ' '
    s.config.suffix = ' '
    return s
  }
  const bar = makeInstance('context-bar')
  bar.config.barColorMode = 'gradient'
  bar.config.barWidth = 12
  const pct = makeInstance('context-pct')
  pct.config.prefix = ' '
  return [
    [
      makeInstance('model'),
      sep(),
      makeInstance('cwd-basename'),
      makeInstance('git-branch'),
      sep(),
      bar,
      pct,
      sep(),
      makeInstance('cost'),
    ],
  ]
}

export default function App() {
  // a shared link's document takes precedence over the local autosave
  const [rows, setRows] = useState<ElementInstance[][]>(
    () => docFromHash() ?? loadRows() ?? defaultRows(),
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  // MOCK is a mutable singleton; bumping this re-renders the preview after edits
  const [, bumpMock] = useReducer((x: number) => x + 1, 0)

  useEffect(() => {
    // the imported design becomes the working copy; drop the stale hash
    if (location.hash) history.replaceState(null, '', location.pathname + location.search)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
    } catch {
      // storage full or unavailable — autosave is best-effort
    }
  }, [rows])

  // ── history ────────────────────────────
  const past = useRef<ElementInstance[][][]>([])
  const future = useRef<ElementInstance[][][]>([])
  // consecutive inspector edits to the same element coalesce into one undo step
  const lastPatchId = useRef<string | null>(null)

  /** apply a document change, recording it in the undo history */
  const commit = (next: ElementInstance[][], patchId?: string) => {
    if (next === rows) return
    if (!(patchId && lastPatchId.current === patchId)) {
      past.current.push(rows)
      if (past.current.length > 100) past.current.shift()
    }
    future.current = []
    lastPatchId.current = patchId ?? null
    setRows(next)
  }

  const undo = () => {
    const prev = past.current.pop()
    if (!prev) return
    future.current.push(rows)
    lastPatchId.current = null
    setRows(prev)
    if (selectedId && !prev.flat().some((e) => e.id === selectedId)) setSelectedId(null)
  }

  const redo = () => {
    const next = future.current.pop()
    if (!next) return
    past.current.push(rows)
    lastPatchId.current = null
    setRows(next)
    if (selectedId && !next.flat().some((e) => e.id === selectedId)) setSelectedId(null)
  }

  const resetDoc = () => {
    if (!window.confirm('Reset the status line to the default template?')) return
    commit(defaultRows())
    setSelectedId(null)
  }

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
    const next = rows.map((r) => [...r])
    const row = next[Math.min(rowIndex ?? next.length - 1, next.length - 1)]
    row.splice(at ?? row.length, 0, el)
    commit(next)
    setSelectedId(el.id)
  }

  const removeElement = (id: string) => {
    commit(rows.map((r) => r.filter((e) => e.id !== id)))
    if (selectedId === id) setSelectedId(null)
  }

  const patchElement = (id: string, patch: Partial<ElementConfig>) => {
    commit(
      rows.map((r) => r.map((e) => (e.id === id ? { ...e, config: { ...e.config, ...patch } } : e))),
      id,
    )
  }

  const addRow = () => commit([...rows, []])
  const removeRow = (i: number) => {
    if (rows.length <= 1) return
    if (selectedId && rows[i]?.some((e) => e.id === selectedId)) setSelectedId(null)
    commit(rows.filter((_, idx) => idx !== i))
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
      const next = rows.map((r) => [...r])
      next[t[0]].splice(Math.min(t[1], next[t[0]].length), 0, el)
      commit(next)
      setSelectedId(el.id)
      return
    }

    if (aid === oid) return
    const from = locate(aid, rows)
    const to = resolveTarget(rows)
    if (!from || !to) return
    const next = rows.map((r) => [...r])
    if (from[0] === to[0]) {
      next[from[0]] = arrayMove(next[from[0]], from[1], Math.min(to[1], next[from[0]].length - 1))
    } else {
      const [el] = next[from[0]].splice(from[1], 1)
      next[to[0]].splice(Math.min(to[1], next[to[0]].length), 0, el)
    }
    commit(next)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // let text fields keep their native undo and delete behavior
      const t = e.target as HTMLElement | null
      if (t?.closest('input, textarea, select, [contenteditable="true"]')) return
      const mod = e.ctrlKey || e.metaKey
      if (mod && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
      } else if ((mod && e.shiftKey && e.key.toLowerCase() === 'z') || (mod && e.key.toLowerCase() === 'y')) {
        e.preventDefault()
        redo()
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        removeElement(selectedId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

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
            <img src={logoUrl} alt="Claude Code Statusline Editor" className="brand-logo" />
          </h1>
          <p className="brand-sub">drag · style · export</p>
        </div>
        <div className="header-right">
          <span className="header-meta">stdin JSON → jq → ANSI → your terminal</span>
          <a
            className="github-link"
            href="https://github.com/azekyoo/claude-code-status-line-editor"
            target="_blank"
            rel="noreferrer"
            title="View source on GitHub"
            aria-label="GitHub repository"
          >
            <svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor" aria-hidden>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
          </a>
        </div>
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

            <MockPanel onChange={bumpMock} />

            <section className="canvas">
              <div className="canvas-head">
                <h2 className="panel-title">Lines</h2>
                <div className="canvas-actions">
                  <button className="ghost-btn" onClick={undo} title="undo (Ctrl+Z)">
                    ↶
                  </button>
                  <button className="ghost-btn" onClick={redo} title="redo (Ctrl+Shift+Z)">
                    ↷
                  </button>
                  <button className="ghost-btn" onClick={resetDoc} title="restore default template">
                    reset
                  </button>
                  <button className="ghost-btn" onClick={addRow}>
                    + add line
                  </button>
                </div>
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

          <Inspector
            el={selected}
            onChange={patchElement}
            onRemove={removeElement}
            onClose={() => setSelectedId(null)}
          />
        </main>

        <DragOverlay>
          {dragLabel ? <div className="chip drag-overlay">{dragLabel}</div> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

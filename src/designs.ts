import type { ElementInstance } from './types'
import { toWire, type WireDoc } from './share'

export interface SavedDesign {
  id: string
  name: string
  savedAt: number
  wire: WireDoc
}

const KEY = 'ccse-designs-v1'

export function listDesigns(): SavedDesign[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (d): d is SavedDesign =>
        !!d && typeof d === 'object' && typeof d.name === 'string' && !!d.wire,
    )
  } catch {
    return []
  }
}

function persist(designs: SavedDesign[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(designs))
  } catch {
    /* storage full — best-effort */
  }
}

export function saveDesign(name: string, rows: ElementInstance[][]): SavedDesign[] {
  const designs = listDesigns()
  const design: SavedDesign = {
    id: `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    savedAt: Date.now(),
    wire: toWire(rows),
  }
  const next = [design, ...designs]
  persist(next)
  return next
}

export function deleteDesign(id: string): SavedDesign[] {
  const next = listDesigns().filter((d) => d.id !== id)
  persist(next)
  return next
}

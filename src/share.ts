import type { ElementConfig, ElementInstance, ElementType } from './types'
import { DEFAULT_CONFIG, ELEMENT_DEFS, makeInstance } from './elements'

/** compact wire format: rows of { t: type, c?: non-default config fields } */
interface WireElement {
  t: ElementType
  c?: Partial<ElementConfig>
}
interface WireDoc {
  v: 1
  r: WireElement[][]
}

const typeDefaults = (type: ElementType): ElementConfig => ({
  ...DEFAULT_CONFIG,
  ...ELEMENT_DEFS[type].defaults,
})

const b64urlEncode = (s: string): string => {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const b64urlDecode = (s: string): string => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodeDoc(rows: ElementInstance[][]): string {
  const wire: WireDoc = {
    v: 1,
    r: rows.map((row) =>
      row.map((el) => {
        const defaults = typeDefaults(el.type)
        const diff: Partial<ElementConfig> = {}
        for (const key of Object.keys(el.config) as (keyof ElementConfig)[]) {
          if (el.config[key] !== defaults[key]) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(diff as any)[key] = el.config[key]
          }
        }
        return Object.keys(diff).length > 0 ? { t: el.type, c: diff } : { t: el.type }
      }),
    ),
  }
  return b64urlEncode(JSON.stringify(wire))
}

export function decodeDoc(payload: string): ElementInstance[][] | null {
  try {
    const wire: unknown = JSON.parse(b64urlDecode(payload))
    if (!wire || typeof wire !== 'object' || (wire as WireDoc).v !== 1) return null
    const r = (wire as WireDoc).r
    if (!Array.isArray(r)) return null
    const rows = r.map((row) =>
      (Array.isArray(row) ? row : [])
        .filter((e) => !!e && typeof e === 'object' && (e as WireElement).t in ELEMENT_DEFS)
        .map((e) => {
          const el = makeInstance((e as WireElement).t)
          return { ...el, config: { ...el.config, ...((e as WireElement).c ?? {}) } }
        }),
    )
    return rows.some((row) => row.length > 0) ? rows : null
  } catch {
    return null
  }
}

export function shareUrl(rows: ElementInstance[][]): string {
  return `${location.origin}${location.pathname}#d=${encodeDoc(rows)}`
}

/** doc from the current URL hash, if any */
export function docFromHash(): ElementInstance[][] | null {
  const m = /^#d=([A-Za-z0-9_-]+)$/.exec(location.hash)
  return m ? decodeDoc(m[1]) : null
}

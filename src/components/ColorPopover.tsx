import { useEffect, useRef, useState } from 'react'
import { HexColorPicker } from 'react-colorful'

const WIDTH = 216
const HEIGHT = 290

/** Inline color picker popover spawned at the trigger click position,
 *  clamped to the viewport (native input[type=color] popups open wherever
 *  the OS pleases — often the top-left corner). */
export default function ColorPopover({
  x,
  y,
  value,
  onChange,
  onClose,
}: {
  x: number
  y: number
  value: string
  onChange: (hex: string) => void
  onClose: () => void
}) {
  const [hexInput, setHexInput] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [onClose])

  const left = Math.max(8, Math.min(x - WIDTH / 2, window.innerWidth - WIDTH - 8))
  const top = Math.max(8, Math.min(y + 12, window.innerHeight - HEIGHT - 8))

  const commitHex = (raw: string) => {
    setHexInput(raw)
    const m = /^#?([0-9a-f]{6})$/i.exec(raw.trim())
    if (m) onChange('#' + m[1].toLowerCase())
  }

  return (
    <div ref={ref} className="color-popover" style={{ left, top }}>
      <HexColorPicker
        color={value}
        onChange={(c) => {
          setHexInput(c)
          onChange(c)
        }}
      />
      <div className="color-popover-row">
        <span className="color-popover-swatch" style={{ background: value }} />
        <input
          className="field-input"
          value={hexInput}
          onChange={(e) => commitHex(e.target.value)}
          spellCheck={false}
        />
      </div>
    </div>
  )
}

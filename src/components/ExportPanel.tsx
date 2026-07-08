import { useMemo, useState } from 'react'
import type { Doc } from '../types'
import { downloadScript, generateScript, SETTINGS_SNIPPET } from '../exporter'
import { shareUrl } from '../share'

export default function ExportPanel({ doc }: { doc: Doc }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const script = useMemo(() => generateScript(doc), [doc])

  const copy = async () => {
    await navigator.clipboard.writeText(script)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const share = async () => {
    await navigator.clipboard.writeText(shareUrl(doc.rows))
    setShared(true)
    setTimeout(() => setShared(false), 1500)
  }

  return (
    <section className="export">
      <div className="export-bar">
        <button className="export-toggle" onClick={() => setOpen((o) => !o)}>
          {open ? '▾' : '▸'} statusline.sh
        </button>
        <div className="export-actions">
          <button className="ghost-btn" onClick={share} title="copy a link that opens this design">
            {shared ? 'link copied ✓' : 'share link'}
          </button>
          <button className="ghost-btn" onClick={copy}>
            {copied ? 'copied ✓' : 'copy'}
          </button>
          <button className="accent-btn" onClick={() => downloadScript(doc)}>
            ↓ download .sh
          </button>
        </div>
      </div>
      {open && (
        <div className="export-body">
          <pre className="export-code">{script}</pre>
          <div className="export-install">
            <h3 className="palette-cat">Install</h3>
            <ol>
              <li>
                Save as <code>~/.claude/statusline.sh</code> and <code>chmod +x</code> it
              </li>
              <li>
                Add to <code>~/.claude/settings.json</code>:
                <pre className="export-code small">{SETTINGS_SNIPPET}</pre>
              </li>
              <li>
                Requires <code>jq</code> on PATH
              </li>
            </ol>
          </div>
        </div>
      )}
    </section>
  )
}

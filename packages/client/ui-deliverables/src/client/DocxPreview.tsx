import { useEffect, useState } from 'react'
import mammoth from 'mammoth/mammoth.browser.js'
import css from './ArtifactDetailsPanel.module.css'

export function DocxPreview({ data, title }: { data: string; title: string }) {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setHtml(null)
    setError(null)
    const binary = atob(data)
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
    void mammoth.convertToHtml({ arrayBuffer: bytes.buffer }).then(
      (result) => { if (active) setHtml(result.value) },
      (reason) => { if (active) setError(reason instanceof Error ? reason.message : String(reason)) },
    )
    return () => { active = false }
  }, [data])

  if (error !== null) return <div className={css.documentFallback}>无法解析 Word 预览：{error}</div>
  if (html === null) return <div className={css.documentFallback}>正在生成 Word 预览…</div>
  return <iframe className={css.document} sandbox="" srcDoc={html} title={title} />
}

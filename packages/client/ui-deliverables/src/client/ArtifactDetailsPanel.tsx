import { useEffect, useMemo, useState } from 'react'
import { CodeBlock, MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import type { IApiClient, WorkspaceArtifactFile } from '@deepseek-ai/dsh-client-connection/client'
import type { DetailsArtifactOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { NS } from './locales.ts'
import { ImageCanvasEditor } from './ImageCanvasEditor.tsx'
import { DocxPreview } from './DocxPreview.tsx'
import css from './ArtifactDetailsPanel.module.css'

interface ArtifactDetailsInjected {
  /** Connection-owned payload API; components never mint RPC ids themselves. */
  api: IApiClient
}

type ArtifactDetailsPanelProps = PropsRuntime<'conversation.details.artifact'>
  & DetailsArtifactOwnerProps & PropsLocale<typeof NS> & InjectFace<ArtifactDetailsInjected>

function extension(path: string): string {
  const index = path.lastIndexOf('.')
  return index === -1 ? '' : path.slice(index).toLowerCase()
}

function textLanguage(path: string): string {
  const ext = extension(path)
  return ext === '.md' || ext === '.mdx' ? 'markdown' : ext.slice(1) || 'text'
}

function htmlPreview(path: string, content: string, className = css.html) {
  // Generated pages commonly rely on their own inline scripts for charts,
  // interactions, and client-side rendering. Keep their origin opaque and
  // withhold every other privilege, while allowing that page-local behavior.
  return <iframe className={className} sandbox="allow-scripts" srcDoc={content} title={path} />
}

function expandedTextPreview(path: string, content: string) {
  const ext = extension(path)
  if (ext === '.html' || ext === '.htm') return htmlPreview(path, content, css.expandedHtml)
  return <div className={css.expandedMarkdown}><MarkdownText text={content} /></div>
}

function previewFor(path: string, file: WorkspaceArtifactFile, t: ArtifactDetailsPanelProps['t']) {
  if (file.kind === 'image') {
    return <img className={css.image} src={`data:${file.mimeType};base64,${file.data}`} alt={t('artifact.imageAlt')} />
  }
  if (file.kind === 'binary' && file.format === 'pdf') {
    return <iframe className={css.document} src={`data:${file.mimeType};base64,${file.data}`} title={path} />
  }
  if (file.kind === 'binary') {
    return <DocxPreview data={file.data} title={path} />
  }
  const ext = extension(path)
  if (ext === '.html' || ext === '.htm') {
    return htmlPreview(path, file.content)
  }
  if (ext === '.md' || ext === '.mdx') return <div className={css.markdown}><MarkdownText text={file.content} /></div>
  return <CodeBlock code={file.content} lang={textLanguage(path)} copyLabel="Copy" copiedLabel="Copied" />
}

/** Right-side generated-artifact reader/editor. Host enforces all path and size guards. */
export function ArtifactDetailsPanel({ artifact, api, t }: ArtifactDetailsPanelProps) {
  const [file, setFile] = useState<WorkspaceArtifactFile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'preview' | 'edit'>('preview')
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expandedPreview, setExpandedPreview] = useState(false)

  useEffect(() => {
    let active = true
    setFile(null)
    setError(null)
    setMode('preview')
    setDraft('')
    setSaved(false)
    setExpandedPreview(false)
    api.workspace.readFile({ workspaceId: artifact.workspaceId, path: artifact.path })
      .then((response) => {
        if (!active) return
        if (!response.result.ok) {
          setError(response.result.error.message)
          return
        }
        setFile(response.result.value)
        if (response.result.value.kind === 'text') setDraft(response.result.value.content)
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason))
      })
    return () => { active = false }
  }, [api, artifact.path, artifact.workspaceId])

  const editable = file?.kind === 'text'
  const imageEditable = file?.kind === 'image'
  const nativeEditable = file !== null && file.kind !== 'text'
  const htmlContent = file?.kind === 'text' && (extension(artifact.path) === '.html' || extension(artifact.path) === '.htm')
    ? file.content
    : undefined
  const markdownContent = file?.kind === 'text' && (extension(artifact.path) === '.md' || extension(artifact.path) === '.mdx')
    ? file.content
    : undefined
  const expandableContent = htmlContent ?? markdownContent
  const markdownExpanded = markdownContent !== undefined
  const preview = useMemo(() => file === null ? null : previewFor(artifact.path, file, t), [artifact.path, file, t])
  const livePreview = useMemo(() => {
    if (file === null || file.kind !== 'text') return null
    return previewFor(artifact.path, { kind: 'text', content: draft }, t)
  }, [artifact.path, draft, file, t])
  const save = async (): Promise<void> => {
    if (!editable || saving) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const response = await api.workspace.writeFile({
        workspaceId: artifact.workspaceId,
        path: artifact.path,
        content: draft,
      })
      if (!response.result.ok) throw new Error(response.result.error.message)
      setFile({ kind: 'text', content: draft })
      setMode('preview')
      setSaved(true)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setSaving(false)
    }
  }
  const saveImage = async (data: string): Promise<void> => {
    if (file?.kind !== 'image' || saving) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const response = await api.workspace.writeFile({ workspaceId: artifact.workspaceId, path: artifact.path, data })
      if (!response.result.ok) throw new Error(response.result.error.message)
      setFile({ kind: 'image', mimeType: file.mimeType, data })
      setMode('preview')
      setSaved(true)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setSaving(false)
    }
  }

  if (file === null && error === null) return <div className={css.status}>{t('artifact.loading')}</div>
  if (error !== null && file === null) return <div className={css.error}>{t('artifact.failed', { message: error })}</div>
  return (
    <section className={css.root}>
      {(editable || imageEditable) && (
        <div className={css.actions}>
          <button type="button" className={mode === 'preview' ? css.active : undefined} onClick={() => { setMode('preview') }}>
            {t('artifact.preview')}
          </button>
          <button type="button" className={mode === 'edit' ? css.active : undefined} onClick={() => { setMode('edit') }}>
            {t('artifact.edit')}
          </button>
          {mode === 'edit' && editable && (
            <button type="button" className={css.save} disabled={saving} onClick={() => { void save() }}>
              {saving ? t('artifact.saving') : t('artifact.save')}
            </button>
          )}
          {expandableContent !== undefined && (
            <button type="button" className={css.expand} onClick={() => { setExpandedPreview(true) }}>
              {t('artifact.expandPreview')}
            </button>
          )}
          {saved && <span className={css.saved}>{t('artifact.saved')}</span>}
        </div>
      )}
      {nativeEditable && (
        <div className={css.actions}>
          <button type="button" onClick={() => {
            setError(null)
            void api.workspace.openFile({ workspaceId: artifact.workspaceId, path: artifact.path }).then((response) => {
              if (!response.result.ok) setError(response.result.error.message)
            }).catch((reason) => { setError(reason instanceof Error ? reason.message : String(reason)) })
          }}>
            {t('artifact.openNativeEditor')}
          </button>
        </div>
      )}
      {error !== null && <div className={css.error}>{t('artifact.saveFailed', { message: error })}</div>}
      {mode === 'edit' && imageEditable && file?.kind === 'image'
        ? <ImageCanvasEditor mimeType={file.mimeType} data={file.data} saving={saving} onSave={saveImage} />
        : mode === 'edit' && editable
          ? (
            <div className={css.editSplit}>
              <textarea
                className={css.editor}
                value={draft}
                onChange={(event) => { setDraft(event.target.value); setSaved(false) }}
                spellCheck={false}
              />
              <section className={css.livePreview} aria-label={t('artifact.livePreview')}>
                <div className={css.livePreviewLabel}>{t('artifact.livePreview')}</div>
                {livePreview}
              </section>
            </div>
          )
          : preview}
      {expandableContent !== undefined && expandedPreview && (
        <div className={css.previewOverlay} role="dialog" aria-modal="true" aria-label={markdownExpanded
          ? mode === 'edit' ? t('artifact.expandedMarkdownEditor') : t('artifact.expandedMarkdownPreview')
          : mode === 'edit' ? t('artifact.expandedEditor') : t('artifact.expandedPreview')}>
          <div className={css.previewOverlayHeader}>
            <span>{markdownExpanded
              ? mode === 'edit' ? t('artifact.expandedMarkdownEditor') : t('artifact.expandedMarkdownPreview')
              : mode === 'edit' ? t('artifact.expandedEditor') : t('artifact.expandedPreview')}</span>
            <div className={css.previewOverlayActions}>
              {mode === 'edit' && (
                <button type="button" disabled={saving} onClick={() => { void save() }}>
                  {saving ? t('artifact.saving') : t('artifact.save')}
                </button>
              )}
              <button type="button" onClick={() => { setExpandedPreview(false) }}>
                {t('artifact.closeExpandedPreview')}
              </button>
            </div>
          </div>
          {mode === 'edit'
            ? (
              <div className={css.expandedEditSplit}>
                <textarea
                  className={css.editor}
                  value={draft}
                  onChange={(event) => { setDraft(event.target.value); setSaved(false) }}
                  spellCheck={false}
                />
                <section className={`${css.livePreview} ${css.expandedLivePreview}`} aria-label={t('artifact.livePreview')}>
                  <div className={css.livePreviewLabel}>{t('artifact.livePreview')}</div>
                  {expandedTextPreview(artifact.path, draft)}
                </section>
              </div>
            )
            : expandedTextPreview(artifact.path, expandableContent)}
        </div>
      )}
    </section>
  )
}

import { useEffect, useMemo, useState } from 'react'

import styles from './SanitizedJsonViewer.module.css'
import { safeHtml } from './safeHtml'

interface SanitizedJsonViewerProps {
  id: string
  label: string
  value?: unknown
  maxBytesBeforeLazy?: number
}

const DEFAULT_LAZY_THRESHOLD = 10 * 1024

const serializeValue = (value?: unknown): string | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    return String(value)
  }
}

const buildPreview = (text: string): string => {
  const lines = text.split(/\r?\n/)
  if (lines.length <= 3) {
    return text
  }
  const limited = lines.slice(0, 3)
  limited[2] = `${limited[2]} …`
  return limited.join('\n')
}

const SanitizedJsonViewer = ({ id, label, value, maxBytesBeforeLazy = DEFAULT_LAZY_THRESHOLD }: SanitizedJsonViewerProps) => {
  const serialized = useMemo(() => serializeValue(value), [value])
  const byteLength = useMemo(() => {
    if (!serialized) return 0
    return new TextEncoder().encode(serialized).length
  }, [serialized])
  const shouldLazyRender = Boolean(serialized && byteLength > maxBytesBeforeLazy)
  const preview = useMemo(() => {
    if (!serialized || shouldLazyRender) return null
    return buildPreview(serialized)
  }, [serialized, shouldLazyRender])

  const [expanded, setExpanded] = useState(false)
  const [sanitizedContent, setSanitizedContent] = useState<string | null>(null)
  const [removedDangerousContent, setRemovedDangerousContent] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const contentId = `${id}-content`
  const canExpand = Boolean(serialized)

  useEffect(() => {
    setExpanded(false)
    setSanitizedContent(null)
    setRemovedDangerousContent(false)
    setErrorMessage(null)
  }, [serialized])

  useEffect(() => {
    if (!expanded || !serialized || sanitizedContent || errorMessage) {
      return
    }

    try {
      const result = safeHtml(serialized)
      setSanitizedContent(result.html)
      setRemovedDangerousContent(result.removed)
    } catch (error) {
      setErrorMessage('JSONの整形に失敗しました')
      if (process.env.NODE_ENV !== 'production') {
        console.error('[SanitizedJsonViewer] failed to sanitize payload', error)
      }
    }
  }, [expanded, serialized, sanitizedContent, errorMessage])

  return (
    <section className={styles.viewer} aria-live="polite">
      <header className={styles.viewerHeader}>
        <span className={styles.viewerTitle}>{label}</span>
        <button
          type="button"
          className={styles.toggleButton}
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((prev) => !prev)}
          disabled={!canExpand}
        >
          {expanded ? `${label}を折りたたむ` : `${label}を展開`}
        </button>
      </header>
      <div id={contentId} className={styles.viewerBody} data-state={expanded ? 'expanded' : 'collapsed'}>
        {!canExpand ? (
          <p className={styles.placeholder}>データなし</p>
        ) : !expanded ? (
          shouldLazyRender ? (
            <p className={styles.placeholder}>展開して読み込む</p>
          ) : (
            <pre className={styles.preview}>{preview}</pre>
          )
        ) : errorMessage ? (
          <p className={styles.errorMessage}>{errorMessage}</p>
        ) : sanitizedContent ? (
          <pre className={styles.viewerContent} dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
        ) : (
          <p className={styles.placeholder}>読み込み中...</p>
        )}
      </div>
      {removedDangerousContent ? (
        <p className={styles.warning}>安全のため一部の内容をマスクしました</p>
      ) : null}
    </section>
  )
}

export default SanitizedJsonViewer

import { useEffect, useMemo, useState } from 'react'

import { safeHtml } from './safeHtml'
import styles from './SanitizedJsonViewer.module.css'

interface SanitizedJsonViewerProps {
  id: string
  label: string
  value?: unknown
  maxBytesBeforeLazy?: number
  expanded?: boolean
  onExpandedChange?: (next: boolean) => void
}

const DEFAULT_LAZY_THRESHOLD = 10 * 1024

const serializeValue = (value?: unknown): string | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return '[unserializable]'
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

const SanitizedJsonViewer = ({
  id,
  label,
  value,
  maxBytesBeforeLazy = DEFAULT_LAZY_THRESHOLD,
  expanded,
  onExpandedChange,
}: SanitizedJsonViewerProps) => {
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

  const isControlled = typeof expanded === 'boolean'
  const [internalExpanded, setInternalExpanded] = useState(false)
  const resolvedExpanded = isControlled ? Boolean(expanded) : internalExpanded
  const contentId = `${id}-content`
  const canExpand = Boolean(serialized)

  useEffect(() => {
    if (!isControlled) {
      setInternalExpanded(false)
    }
  }, [serialized, isControlled])

  const sanitizedState = useMemo(() => {
    if (!resolvedExpanded || !serialized) {
      return { html: null, removed: false, error: null }
    }

    try {
      const result = safeHtml(serialized)
      return { html: result.html, removed: result.removed, error: null }
    } catch (cause) {
      if (typeof console !== 'undefined' && typeof console.error === 'function') {
        console.error('[SanitizedJsonViewer] failed to sanitize payload', cause)
      }
      return { html: null, removed: false, error: 'JSONの整形に失敗しました' }
    }
  }, [resolvedExpanded, serialized])

  const sanitizedContent = sanitizedState.html
  const removedDangerousContent = sanitizedState.removed
  const errorMessage = sanitizedState.error

  const toggleExpanded = () => {
    if (!canExpand) {
      return
    }
    if (isControlled) {
      onExpandedChange?.(!resolvedExpanded)
      return
    }
    setInternalExpanded((prev) => !prev)
  }

  return (
    <section className={styles.viewer} aria-live="polite">
      <header className={styles.viewerHeader}>
        <span className={styles.viewerTitle}>{label}</span>
        <button
          type="button"
          className={styles.toggleButton}
          aria-expanded={resolvedExpanded}
          aria-controls={contentId}
          onClick={toggleExpanded}
          disabled={!canExpand}
        >
          {resolvedExpanded ? `${label}を折りたたむ` : `${label}を展開`}
        </button>
      </header>
      <div id={contentId} className={styles.viewerBody} data-state={resolvedExpanded ? 'expanded' : 'collapsed'}>
        {!canExpand ? (
          <p className={styles.placeholder}>データなし</p>
        ) : !resolvedExpanded ? (
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
          <p className={styles.placeholder}>データなし</p>
        )}
      </div>
      {removedDangerousContent ? (
        <p className={styles.warning}>安全のため一部の内容をマスクしました</p>
      ) : null}
    </section>
  )
}

export default SanitizedJsonViewer

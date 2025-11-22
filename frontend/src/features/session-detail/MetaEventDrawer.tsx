import { useEffect } from 'react'

import type { SessionVariant } from '@/api/types/sessions'

import styles from './MetaEventDrawer.module.css'
import MetaEventsPanel from './MetaEventsPanel'
import ToolBundlePanel from './ToolBundlePanel'

import type { MetaEventGroup, TimelineBundleSummary, ToolInvocationGroup } from './types'

export interface MetaEventDrawerProps {
  open: boolean
  onClose: () => void
  variant: SessionVariant
  placement: 'side' | 'bottom'
  summary?: TimelineBundleSummary | null
  metaEvents: MetaEventGroup[]
  toolInvocations: ToolInvocationGroup[]
  sessionId?: string
}

const MetaEventDrawer = ({
  open,
  onClose,
  variant,
  placement,
  summary,
  metaEvents,
  toolInvocations,
  sessionId,
}: MetaEventDrawerProps) => {
  const isVisible = open && Boolean(summary)
  const sanitized = Boolean(summary?.isSanitizedVariant ?? variant === 'sanitized')
  const viewerMode = sanitized ? 'redacted' : 'default'
  const titleId = 'meta-event-drawer-title'

  useEffect(() => {
    if (!isVisible) {
      return
    }
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => {
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [isVisible, onClose])

  if (!isVisible || !summary) {
    return null
  }

  return (
    <div className={styles.host} data-placement={placement} data-open={open ? 'true' : 'false'}>
      <div className={styles.backdrop} role="presentation" onClick={onClose} />
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="meta-event-drawer"
      >
        <header className={styles.header}>
          <div>
            <p id={titleId} className={styles.title}>
              {summary.label}
            </p>
            <p className={styles.count}>{summary.count}件</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            詳細を閉じる
          </button>
        </header>
        {sanitized ? <p className={styles.sanitizedBanner}>サニタイズ版のイベントを表示中</p> : null}
        <div className={styles.body}>
          {summary.bundleType === 'tool' ? (
            <ToolBundlePanel toolInvocations={toolInvocations} sessionId={sessionId} viewerMode={viewerMode} />
          ) : (
            <MetaEventsPanel metaEvents={metaEvents} sessionId={sessionId} payloadMode={viewerMode} />
          )}
        </div>
      </aside>
    </div>
  )
}

export default MetaEventDrawer

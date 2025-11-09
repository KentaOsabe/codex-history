import { useCallback, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'

import type { SessionVariant } from '@/api/types/sessions'

import SessionDetailHeader from './SessionDetailHeader'
import MessageTimeline from './MessageTimeline'
import type { ScrollAnchorSnapshot } from './types'
import { useSessionDetailViewModel } from './useSessionDetailViewModel'
import styles from './SessionDetailPage.module.css'

const SessionDetailPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const resolvedSessionId = sessionId ?? '(未指定)'
  const {
    status,
    detail,
    error,
    variant,
    hasSanitizedVariant,
    setVariant,
    refetch,
    preserveScrollAnchor,
    consumeScrollAnchor,
  } = useSessionDetailViewModel({ sessionId })
  const timelineRef = useRef<HTMLDivElement | null>(null)
  const boundaryTriggerRef = useRef<{ direction: 'start' | 'end'; timestamp: number } | null>(null)

  const captureScrollAnchor = useCallback(() => {
    const container = timelineRef.current
    if (!container) return null
    const maxScroll = Math.max(container.scrollHeight - container.clientHeight, 1)
    return {
      offsetRatio: container.scrollTop / maxScroll,
      absoluteOffset: container.scrollTop,
    }
  }, [])

  const restoreScrollAnchor = useCallback((anchor: ReturnType<typeof captureScrollAnchor>) => {
    if (!anchor) return
    const container = timelineRef.current
    if (!container) return
    const maxScroll = Math.max(container.scrollHeight - container.clientHeight, 0)
    const target = anchor.absoluteOffset ?? anchor.offsetRatio * maxScroll
    container.scrollTop = target
  }, [])

  const handleVariantChange = useCallback(
    (nextVariant: SessionVariant) => {
      const anchor = captureScrollAnchor()
      preserveScrollAnchor(anchor)
      setVariant(nextVariant)
    },
    [captureScrollAnchor, preserveScrollAnchor, setVariant],
  )

  const handleScrollAnchorChange = useCallback(
    (anchor: ScrollAnchorSnapshot | null) => {
      if (!anchor) return
      preserveScrollAnchor(anchor)
    },
    [preserveScrollAnchor],
  )

  const handleRetry = useCallback(() => {
    void refetch()
  }, [refetch])

  const triggerBoundaryLoad = useCallback(
    (direction: 'start' | 'end') => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const lastTrigger = boundaryTriggerRef.current
      if (lastTrigger && lastTrigger.direction === direction && now - lastTrigger.timestamp < 1200) {
        return
      }
      boundaryTriggerRef.current = { direction, timestamp: now }
      const anchor = captureScrollAnchor()
      preserveScrollAnchor(anchor)
      void refetch()
    },
    [captureScrollAnchor, preserveScrollAnchor, refetch],
  )

  const handleReachTop = useCallback(() => {
    triggerBoundaryLoad('start')
  }, [triggerBoundaryLoad])

  const handleReachBottom = useCallback(() => {
    triggerBoundaryLoad('end')
  }, [triggerBoundaryLoad])

  useEffect(() => {
    const anchor = consumeScrollAnchor()
    if (!anchor) return
    requestAnimationFrame(() => {
      restoreScrollAnchor(anchor)
    })
  }, [consumeScrollAnchor, restoreScrollAnchor, detail, variant])

  return (
    <article className={styles.container} aria-live="polite">
      <div className={styles.hero}>
        <span className={styles.heroBadge}>Session Detail</span>
        <p className={styles.heroMeta}>
          現在のセッション: <code>{resolvedSessionId}</code>
        </p>
      </div>

      {status === 'error' && error ? (
        <section className={styles.errorBanner} role="alert">
          <div>
            <p className={styles.errorTitle}>表示に失敗しました</p>
            <p className={styles.errorMessage}>{error.message}</p>
          </div>
          <button type="button" className={styles.retryButton} onClick={handleRetry}>
            再読み込み
          </button>
        </section>
      ) : null}

      {status === 'loading' ? (
        <div className={styles.skeleton}>
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
        </div>
      ) : null}

      {detail ? (
        <>
          <SessionDetailHeader
            detail={detail}
            variant={variant}
            hasSanitizedVariant={hasSanitizedVariant}
            onVariantChange={handleVariantChange}
          />
          <section className={styles.infoBar}>
            <span>
              データソース: <code>{detail.meta.relativePath}</code>
            </span>
            {detail.meta.lastUpdatedLabel ? <span>最終更新: {detail.meta.lastUpdatedLabel}</span> : null}
          </section>
          <section className={`${styles.timelinePlaceholder} ${styles.timelineSection}`}>
            <h2 className={styles.timelineHeading}>メッセージタイムライン</h2>
            <MessageTimeline
              ref={timelineRef}
              className={styles.timelineContainer}
              messages={detail.messages}
              onReachStart={handleReachTop}
              onReachEnd={handleReachBottom}
              onScrollAnchorChange={handleScrollAnchorChange}
            />
          </section>
        </>
      ) : null}

      <div className={styles.actions}>
        <Link to="/" className={styles.backLink}>
          セッション一覧へ戻る
        </Link>
      </div>
    </article>
  )
}

export default SessionDetailPage

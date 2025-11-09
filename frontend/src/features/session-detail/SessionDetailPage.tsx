import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import type { SessionVariant } from '@/api/types/sessions'

import DetailInsightsPanel from './DetailInsightsPanel'
import MessageTimeline from './MessageTimeline'
import SessionDetailHeader from './SessionDetailHeader'
import styles from './SessionDetailPage.module.css'
import SessionDetailTabs, { type SessionDetailTab } from './SessionDetailTabs'
import { useSessionDetailViewModel } from './useSessionDetailViewModel'

import type { ScrollAnchorSnapshot } from './types'

const TAB_IDS = {
  conversation: 'session-detail-tab-conversation',
  details: 'session-detail-tab-details',
} as const satisfies Record<SessionDetailTab, string>

const PANEL_IDS = {
  conversation: 'session-detail-panel-conversation',
  details: 'session-detail-panel-details',
} as const satisfies Record<SessionDetailTab, string>

const TAB_ANNOUNCEMENTS: Record<SessionDetailTab, string> = {
  conversation: '会話タブを表示しています',
  details: '詳細タブを表示しています',
}

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
  const [activeTab, setActiveTab] = useState<SessionDetailTab>('conversation')
  const [tabAnnouncement, setTabAnnouncement] = useState<string>(TAB_ANNOUNCEMENTS.conversation)
  const conversationPanelRef = useRef<HTMLElement | null>(null)
  const detailPanelRef = useRef<HTMLElement | null>(null)
  const tabStateRef = useRef<Record<string, SessionDetailTab>>({})
  const sessionKey = resolvedSessionId

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

  const handleTabChange = useCallback((nextTab: SessionDetailTab) => {
    setActiveTab((prev) => {
      if (prev === nextTab) {
        return prev
      }
      return nextTab
    })
    tabStateRef.current[sessionKey] = nextTab
  }, [sessionKey])

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
      if (lastTrigger?.direction === direction && now - lastTrigger.timestamp < 1200) {
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
    setTabAnnouncement(TAB_ANNOUNCEMENTS[activeTab])
    const targetPanel = activeTab === 'conversation' ? conversationPanelRef.current : detailPanelRef.current
    if (targetPanel) {
      targetPanel.focus()
    }
  }, [activeTab])

  useEffect(() => {
    const anchor = consumeScrollAnchor()
    if (!anchor) return
    requestAnimationFrame(() => {
      restoreScrollAnchor(anchor)
    })
  }, [consumeScrollAnchor, restoreScrollAnchor, detail, variant])

  useEffect(() => {
    setActiveTab(() => {
      const stored = tabStateRef.current[sessionKey]
      if (stored) {
        return stored
      }
      tabStateRef.current[sessionKey] = 'conversation'
      return 'conversation'
    })
  }, [sessionKey])

  useEffect(() => {
    tabStateRef.current[sessionKey] = activeTab
  }, [activeTab, sessionKey])

  const showTabLayout = status === 'loading' || Boolean(detail)

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
        </>
      ) : null}

      {showTabLayout ? (
        <section className={styles.tabHost} aria-label="セッション詳細ナビゲーション領域">
          <SessionDetailTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            tabIds={TAB_IDS}
            panelIds={PANEL_IDS}
          />
          <p
            className={styles.srOnly}
            aria-live="polite"
            role="status"
            data-testid="session-tab-announcement"
          >
            {tabAnnouncement}
          </p>
          <div className={styles.tabPanels}>
            <section
              id={PANEL_IDS.conversation}
              role="tabpanel"
              aria-labelledby={TAB_IDS.conversation}
              hidden={activeTab !== 'conversation'}
              tabIndex={-1}
              ref={conversationPanelRef}
              data-testid="conversation-tab-panel"
              className={`${styles.timelinePlaceholder} ${styles.timelineSection} ${styles.tabPanel}`}
            >
              <h2 className={styles.timelineHeading}>メッセージタイムライン</h2>
              {detail ? (
                <MessageTimeline
                  ref={timelineRef}
                  className={styles.timelineContainer}
                  messages={detail.messages}
                  onReachStart={handleReachTop}
                  onReachEnd={handleReachBottom}
                  onScrollAnchorChange={handleScrollAnchorChange}
                />
              ) : (
                <div className={styles.skeleton} role="status" aria-live="polite">
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonLine} />
                </div>
              )}
            </section>
            <section
              id={PANEL_IDS.details}
              role="tabpanel"
              aria-labelledby={TAB_IDS.details}
              hidden={activeTab !== 'details'}
              tabIndex={-1}
              ref={detailPanelRef}
              data-testid="details-tab-panel"
              className={`${styles.timelinePlaceholder} ${styles.tabPanel}`}
            >
              <h2 className={styles.timelineHeading}>技術的詳細</h2>
              <DetailInsightsPanel detail={detail} status={status} />
            </section>
          </div>
        </section>
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

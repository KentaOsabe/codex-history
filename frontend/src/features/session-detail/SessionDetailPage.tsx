import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import type { SessionVariant } from '@/api/types/sessions'
import ResponsiveGrid from '@/features/layout/ResponsiveGrid'
import useResponsiveLayout from '@/features/layout/useResponsiveLayout'

import ConversationRegion from './ConversationRegion'
import styles from './SessionDetailPage.module.css'
import SessionSummaryRail from './SessionSummaryRail'
import { useConversationEvents } from './useConversationEvents'
import { useSessionDetailViewModel } from './useSessionDetailViewModel'

import type { SessionDetailTab } from './SessionDetailTabs'
import type { ScrollAnchorSnapshot, TimelineDisplayMode } from './types'

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
  const layout = useResponsiveLayout()
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
  const [timelineMode, setTimelineMode] = useState<TimelineDisplayMode>('conversation')
  const [tabAnnouncement, setTabAnnouncement] = useState<string>(TAB_ANNOUNCEMENTS.conversation)
  const conversationPanelRef = useRef<HTMLElement | null>(null)
  const detailPanelRef = useRef<HTMLElement | null>(null)
  const tabStateRef = useRef<Record<string, SessionDetailTab>>({})
  const filterModeStateRef = useRef<Record<string, TimelineDisplayMode>>({})
  const sessionKey = resolvedSessionId
  const conversationData = useConversationEvents({ detail, variant })

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

  const handleTimelineModeChange = useCallback((nextMode: TimelineDisplayMode) => {
    setTimelineMode((prev) => {
      if (prev === nextMode) {
        return prev
      }
      return nextMode
    })
  }, [])

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

  useEffect(() => {
    setTimelineMode(() => {
      const stored = filterModeStateRef.current[sessionKey]
      if (stored) {
        return stored
      }
      filterModeStateRef.current[sessionKey] = 'conversation'
      return 'conversation'
    })
  }, [sessionKey])

  useEffect(() => {
    filterModeStateRef.current[sessionKey] = timelineMode
  }, [sessionKey, timelineMode])

  const timelineMessages = detail
    ? timelineMode === 'conversation'
      ? conversationData.conversationMessages
      : detail.messages
    : undefined

  const timelineFilterControls = detail
    ? {
        mode: timelineMode,
        hiddenCount: conversationData.hiddenCount,
        bundleSummaries: conversationData.bundleSummaries,
        onModeChange: handleTimelineModeChange,
      }
    : undefined

  return (
    <article
      className={styles.container}
      aria-live="polite"
      data-testid="session-detail-root"
      data-breakpoint={layout.breakpoint}
      data-columns={layout.columns}
    >
      <ResponsiveGrid className={styles.contentGrid} data-testid="session-detail-grid">
        <ConversationRegion
          status={status}
          detail={detail}
          activeTab={activeTab}
          tabAnnouncement={tabAnnouncement}
          tabIds={TAB_IDS}
          panelIds={PANEL_IDS}
          onTabChange={handleTabChange}
          timelineRef={timelineRef}
          conversationPanelRef={conversationPanelRef}
          detailPanelRef={detailPanelRef}
          onReachTop={handleReachTop}
          onReachBottom={handleReachBottom}
          onScrollAnchorChange={handleScrollAnchorChange}
          errorMessage={status === 'error' && error ? error.message : undefined}
          onRetry={handleRetry}
          timelineMessages={timelineMessages}
          timelineFilterControls={layout.columns === 1 ? timelineFilterControls : undefined}
        />

        <SessionSummaryRail
          detail={detail}
          variant={variant}
          hasSanitizedVariant={hasSanitizedVariant}
          onVariantChange={handleVariantChange}
          layout={layout}
          resolvedSessionId={resolvedSessionId}
          timelineFilterControls={layout.columns === 1 ? undefined : timelineFilterControls}
        />
      </ResponsiveGrid>

      <div className={styles.actions}>
        <Link to="/" className={styles.backLink}>
          セッション一覧へ戻る
        </Link>
      </div>
    </article>
  )
}

export default SessionDetailPage


import styles from './ConversationRegion.module.css'
import DetailInsightsPanel from './DetailInsightsPanel'
import MessageTimeline from './MessageTimeline'
import SessionDetailTabs, { type SessionDetailTab } from './SessionDetailTabs'
import TimelineFilterBar, { type TimelineFilterControls } from './TimelineFilterBar'

import type {
  ScrollAnchorSnapshot,
  SessionDetailStatus,
  SessionDetailViewModel,
  SessionMessageViewModel,
} from './types'
import type { RefObject } from 'react'

interface ConversationRegionProps {
  status: SessionDetailStatus
  detail?: SessionDetailViewModel
  activeTab: SessionDetailTab
  tabAnnouncement: string
  tabIds: Record<SessionDetailTab, string>
  panelIds: Record<SessionDetailTab, string>
  onTabChange: (tab: SessionDetailTab) => void
  timelineRef: RefObject<HTMLDivElement>
  conversationPanelRef: RefObject<HTMLElement>
  detailPanelRef: RefObject<HTMLElement>
  onReachTop: () => void
  onReachBottom: () => void
  onScrollAnchorChange: (anchor: ScrollAnchorSnapshot | null) => void
  errorMessage?: string
  onRetry: () => void
  timelineMessages?: SessionMessageViewModel[]
  timelineFilterControls?: TimelineFilterControls
}

const ConversationRegion = ({
  status,
  detail,
  activeTab,
  tabAnnouncement,
  tabIds,
  panelIds,
  onTabChange,
  timelineRef,
  conversationPanelRef,
  detailPanelRef,
  onReachTop,
  onReachBottom,
  onScrollAnchorChange,
  errorMessage,
  onRetry,
  timelineMessages,
  timelineFilterControls,
}: ConversationRegionProps) => {
  const showTabLayout = status === 'loading' || Boolean(detail)

  return (
    <section className={styles.region} aria-label="会話タイムライン領域" data-testid="conversation-region">
      {errorMessage ? (
        <section className={styles.errorBanner} role="alert">
          <div className={styles.errorContent}>
            <p className={styles.errorTitle}>表示に失敗しました</p>
            <p className={styles.errorMessage}>{errorMessage}</p>
          </div>
          <button type="button" className={styles.retryButton} onClick={onRetry}>
            再読み込み
          </button>
        </section>
      ) : null}

      {showTabLayout ? (
        <section className={styles.tabHost} aria-label="セッション詳細ナビゲーション領域">
          <SessionDetailTabs activeTab={activeTab} onTabChange={onTabChange} tabIds={tabIds} panelIds={panelIds} />
          <p className={styles.srOnly} aria-live="polite" role="status" data-testid="session-tab-announcement">
            {tabAnnouncement}
          </p>
          <div className={styles.tabPanels}>
            <section
              id={panelIds.conversation}
              role="tabpanel"
              aria-labelledby={tabIds.conversation}
              hidden={activeTab !== 'conversation'}
              tabIndex={-1}
              ref={conversationPanelRef}
              data-testid="conversation-tab-panel"
              className={`${styles.panelCard} layout-panel layout-panel--padded ${styles.tabPanel} ${styles.timelineSection}`}
            >
              <h2 className={styles.timelineHeading}>メッセージタイムライン</h2>
              {timelineFilterControls ? (
                <TimelineFilterBar placement="timeline" {...timelineFilterControls} />
              ) : null}
              {detail ? (
                <MessageTimeline
                  ref={timelineRef}
                  className={styles.timelineContainer}
                  messages={timelineMessages ?? detail.messages}
                  onReachStart={onReachTop}
                  onReachEnd={onReachBottom}
                  onScrollAnchorChange={onScrollAnchorChange}
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
              id={panelIds.details}
              role="tabpanel"
              aria-labelledby={tabIds.details}
              hidden={activeTab !== 'details'}
              tabIndex={-1}
              ref={detailPanelRef}
              data-testid="details-tab-panel"
              className={`${styles.panelCard} layout-panel layout-panel--padded ${styles.tabPanel}`}
            >
              <h2 className={styles.timelineHeading}>技術的詳細</h2>
              <DetailInsightsPanel detail={detail} status={status} />
            </section>
          </div>
        </section>
      ) : null}
    </section>
  )
}

export default ConversationRegion

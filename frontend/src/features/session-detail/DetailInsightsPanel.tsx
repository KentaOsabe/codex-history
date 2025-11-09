import styles from './DetailInsightsPanel.module.css'

import MetaEventsPanel from './MetaEventsPanel'
import ToolInvocationTimeline from './ToolInvocationTimeline'
import type { SessionDetailStatus, SessionDetailViewModel } from './types'
import { useDetailInsights } from './useDetailInsights'


interface DetailInsightsPanelProps {
  detail?: SessionDetailViewModel
  status: SessionDetailStatus
}

const LOADING_MESSAGE = 'ツール呼び出しとメタイベントの詳細を読み込み中です'

const DetailInsightsPanel = ({ detail, status }: DetailInsightsPanelProps) => {
  if (!detail) {
    return (
      <div className={styles.panel} data-testid="detail-panel-skeleton" aria-busy="true">
        <div className={styles.skeletonBars} aria-hidden="true">
          <span className={styles.skeletonBar} />
          <span className={styles.skeletonBar} />
          <span className={styles.skeletonBar} />
        </div>
        <p className={styles.skeletonMessage}>{LOADING_MESSAGE}</p>
      </div>
    )
  }

  const { toolInvocations, metaEvents } = useDetailInsights(detail)
  const metaEventCount = metaEvents.reduce((total, group) => total + group.events.length, 0)

  return (
    <div className={styles.panel} role="status" aria-live="polite" aria-busy={status === 'loading'}>
      <section className={styles.section} aria-label="ツール呼び出し詳細">
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>ツール呼び出しタイムライン</h3>
          <span className={styles.sectionBadge}>{toolInvocations.length}件</span>
        </div>
        <ToolInvocationTimeline toolInvocations={toolInvocations} />
      </section>

      <section className={styles.section} aria-label="メタイベント">
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>メタイベント</h3>
          <span className={styles.sectionBadge}>{metaEventCount}件</span>
        </div>
        <MetaEventsPanel metaEvents={metaEvents} />
      </section>
    </div>
  )
}

export default DetailInsightsPanel

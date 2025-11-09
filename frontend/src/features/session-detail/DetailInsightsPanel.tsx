import styles from './DetailInsightsPanel.module.css'

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

  const { toolInvocations } = useDetailInsights(detail)

  return (
    <div className={styles.panel} role="status" aria-live="polite" aria-busy={status === 'loading'}>
      <section className={styles.section} aria-label="ツール呼び出し詳細">
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>ツール呼び出しタイムライン</h3>
          <span className={styles.sectionBadge}>{toolInvocations.length}件</span>
        </div>
        <ToolInvocationTimeline toolInvocations={toolInvocations} />
      </section>

      <section className={styles.sectionMuted} aria-label="メタイベント">
        <h3 className={styles.sectionTitle}>メタイベント</h3>
        <p className={styles.placeholderBody}>メタイベントパネルは後続タスクで追加予定です。</p>
      </section>
    </div>
  )
}

export default DetailInsightsPanel

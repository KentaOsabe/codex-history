import styles from './DetailInsightsPanel.module.css'

import type { SessionDetailStatus, SessionDetailViewModel } from './types'


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

  return (
    <div className={styles.panel} role="status" aria-live="polite" aria-busy={status === 'loading'}>
      <div className={styles.placeholderCard}>
        <h3 className={styles.placeholderTitle}>詳細ビューを準備中です</h3>
        <p className={styles.placeholderBody}>{LOADING_MESSAGE}。今後の更新でこちらに表示されます。</p>
        <ul className={styles.placeholderList}>
          <li>call_id 単位のツール呼び出し履歴</li>
          <li>token_count / agent_reasoning のメタイベント</li>
          <li>SafeList サニタイズ済み JSON ビューア</li>
        </ul>
      </div>
    </div>
  )
}

export default DetailInsightsPanel

import type { SessionVariant } from '@/api/types/sessions'

import styles from './SessionDetailHeader.module.css'
import SessionVariantSwitch from './SessionVariantSwitch'

import type { SessionDetailViewModel } from './types'


interface SessionDetailHeaderProps {
  detail: SessionDetailViewModel
  variant: SessionVariant
  hasSanitizedVariant: boolean
  onVariantChange: (variant: SessionVariant) => void
}

const formatCount = (value: number) => value.toLocaleString('ja-JP')

const SessionDetailHeader = ({ detail, variant, hasSanitizedVariant, onVariantChange }: SessionDetailHeaderProps) => {
  return (
    <header className={styles.header} aria-labelledby="session-detail-title">
      <div className={styles.topRow}>
        <div className={styles.titleGroup}>
          <p className={styles.sessionIdLabel}>
            Session ID: <code>{detail.sessionId}</code>
          </p>
          <h1 id="session-detail-title" className={styles.title}>
            {detail.title}
          </h1>
        </div>
        <div className={styles.actions}>
          <SessionVariantSwitch
            variant={variant}
            hasSanitizedVariant={hasSanitizedVariant}
            onChange={onVariantChange}
          />
          {detail.meta.downloadUrl ? (
            <a
              className={styles.downloadButton}
              href={detail.meta.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              JSON をダウンロード
            </a>
          ) : null}
        </div>
      </div>

      <dl className={styles.stats}>
        <div className={styles.statItem}>
          <dt>メッセージ数</dt>
          <dd>{formatCount(detail.stats.messageCount)}</dd>
        </div>
        <div className={styles.statItem}>
          <dt>Reasoning</dt>
          <dd>{formatCount(detail.stats.reasoningCount)}</dd>
        </div>
        <div className={styles.statItem}>
          <dt>ツール呼び出し</dt>
          <dd>{formatCount(detail.stats.toolCallCount)}</dd>
        </div>
        <div className={styles.statItem}>
          <dt>完了時刻</dt>
          <dd>{detail.stats.completedAtLabel ?? '未入力'}</dd>
        </div>
      </dl>
    </header>
  )
}

export default SessionDetailHeader


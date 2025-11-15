import styles from './SessionCard.module.css'

export interface SessionListItem {
  id: string
  title: string
  fallbackLabel: string
  updatedAtLabel: string
  messageCount: number
  summary?: string | null
  hasSanitized: boolean
}

interface SessionCardProps {
  item: SessionListItem
  onSelect: (id: string) => void
  contextLabel?: string
}

const SessionCard = ({ item, onSelect, contextLabel }: SessionCardProps) => {
  const displayTitle = item.title?.trim() || item.fallbackLabel

  return (
    <button
      type="button"
      className={styles.card}
      onClick={() => onSelect(item.id)}
      aria-label={`${displayTitle} を開く`}
    >
      <header className={styles.header}>
        <h3 className={styles.title}>{displayTitle}</h3>
        {item.hasSanitized ? <span className={styles.badge}>Sanitized</span> : null}
        {contextLabel ? <span className={styles.context}>{contextLabel}</span> : null}
      </header>
      <div className={styles.metadata}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>最終更新</span>
          <span className={styles.metaValue}>{item.updatedAtLabel}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>メッセージ数</span>
          <span className={styles.metaValue}>{`${item.messageCount.toLocaleString('ja-JP')}件`}</span>
        </div>
      </div>
      {item.summary ? <p className={styles.summary}>{item.summary}</p> : null}
    </button>
  )
}

export default SessionCard

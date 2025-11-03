import SessionCard, { type SessionListItem } from './SessionCard'
import styles from './SessionList.module.css'

type SessionListVariant = 'loading' | 'ready' | 'empty'

interface SessionListProps {
  items: SessionListItem[]
  variant: SessionListVariant
  onSelect: (id: string) => void
}

const SkeletonCard = () => (
  <div className={styles.skeletonCard} data-testid="session-card-skeleton">
    <div className={styles.skeletonTitle} />
    <div className={styles.skeletonMetaRow} />
    <div className={styles.skeletonMetaRow} />
    <div className={styles.skeletonSummary} />
  </div>
)

const SessionList = ({ items, variant, onSelect }: SessionListProps) => {
  if (variant === 'loading') {
    return (
      <div className={styles.list}>
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonCard key={`skeleton-${index}`} />
        ))}
      </div>
    )
  }

  if (variant === 'empty') {
    return (
      <div className={styles.emptyState}>
        <p>この日に保存されたセッションはありません。</p>
        <p className={styles.emptyHint}>別の日付を選択するか、インデックスを更新してください。</p>
      </div>
    )
  }

  return (
    <div className={styles.list}>
      {items.map((item) => (
        <SessionCard key={item.id} item={item} onSelect={onSelect} />
      ))}
    </div>
  )
}

export default SessionList
export type { SessionListItem, SessionListVariant, SessionListProps }

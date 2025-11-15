import EmptyStateView from './EmptyStateView'
import SessionCard, { type SessionListItem } from './SessionCard'
import styles from './SessionList.module.css'

type SessionListVariant = 'loading' | 'ready' | 'empty'

interface SessionListProps {
  items: SessionListItem[]
  variant: SessionListVariant
  onSelect: (id: string) => void
  contextLabel?: string
}

const SkeletonCard = () => (
  <div className={styles.skeletonCard} data-testid="session-card-skeleton">
    <div className={styles.skeletonTitle} />
    <div className={styles.skeletonMetaRow} />
    <div className={styles.skeletonMetaRow} />
    <div className={styles.skeletonSummary} />
  </div>
)

const SessionList = ({ items, variant, onSelect, contextLabel }: SessionListProps) => {
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
      <EmptyStateView
        title="指定した期間内のセッションはありません"
        hint="別の日付を選択するか、検索条件を調整してください。"
      />
    )
  }

  return (
    <div className={styles.list}>
      {items.map((item) => (
        <SessionCard key={item.id} item={item} onSelect={onSelect} contextLabel={contextLabel} />
      ))}
    </div>
  )
}

export default SessionList
export type { SessionListItem, SessionListVariant, SessionListProps }

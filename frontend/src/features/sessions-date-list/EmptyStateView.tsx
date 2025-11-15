import styles from './EmptyStateView.module.css'

export interface EmptyStateViewProps {
  title: string
  hint?: string
  actionLabel?: string
  onAction?: () => void
}

const EmptyStateView = ({ title, hint, actionLabel, onAction }: EmptyStateViewProps) => {
  return (
    <div className={styles.container} role="status" aria-live="polite">
      <p className={styles.title}>{title}</p>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      {actionLabel && onAction ? (
        <button type="button" className={styles.action} onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}

export default EmptyStateView

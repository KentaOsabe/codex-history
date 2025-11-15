import RetryButton from './RetryButton'
import styles from './StatusBanner.module.css'

import type { FetchErrorView } from './errorView'

interface StatusBannerProps {
  error?: FetchErrorView
  onRetry: () => void
  isRetrying?: boolean
  className?: string
  retryLabel?: string
}

const StatusBanner = ({ error, onRetry, isRetrying = false, className, retryLabel }: StatusBannerProps) => {
  if (!error) return null

  const classNames = className ? `${styles.banner} ${className}` : styles.banner

  return (
    <div className={classNames} role="alert" aria-live="assertive">
      <div className={styles.content}>
        <p className={styles.message}>{error.message}</p>
        {error.detail ? <p className={styles.detail}>{error.detail}</p> : null}
      </div>
      <RetryButton onClick={onRetry} disabled={isRetrying} label={retryLabel} />
    </div>
  )
}

export default StatusBanner

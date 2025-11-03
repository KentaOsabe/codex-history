import styles from './RetryButton.module.css'

interface RetryButtonProps {
  onClick: () => void
  disabled?: boolean
  className?: string
}

const RetryButton = ({ onClick, disabled = false, className }: RetryButtonProps) => {
  const classNames = className ? `${styles.button} ${className}` : styles.button

  return (
    <button
      type="button"
      className={classNames}
      onClick={onClick}
      disabled={disabled}
    >
      再読み込み
    </button>
  )
}

export default RetryButton

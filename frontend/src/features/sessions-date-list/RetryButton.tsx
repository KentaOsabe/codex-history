import styles from './RetryButton.module.css'

interface RetryButtonProps {
  onClick: () => void
  disabled?: boolean
  className?: string
  label?: string
}

const RetryButton = ({ onClick, disabled = false, className, label = '再読み込み' }: RetryButtonProps) => {
  const classNames = className ? `${styles.button} ${className}` : styles.button

  return (
    <button
      type="button"
      className={classNames}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  )
}

export default RetryButton

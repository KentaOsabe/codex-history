import styles from './PaginationControls.module.css'

export interface PaginationControlsProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  label: string
  isLoading?: boolean
  className?: string
}

const clampPage = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min
  if (value < min) return min
  if (value > max) return max
  return Math.floor(value)
}

const PaginationControls = ({
  page,
  totalPages,
  onPageChange,
  label,
  isLoading = false,
  className,
}: PaginationControlsProps) => {
  const normalizedTotal = totalPages > 0 ? totalPages : 1
  const normalizedPage = clampPage(page, 1, normalizedTotal)
  const canGoPrev = normalizedPage > 1
  const canGoNext = normalizedPage < normalizedTotal
  const disablePrev = !canGoPrev || isLoading
  const disableNext = !canGoNext || isLoading

  const handlePrev = () => {
    if (disablePrev) return
    onPageChange(normalizedPage - 1)
  }

  const handleNext = () => {
    if (disableNext) return
    onPageChange(normalizedPage + 1)
  }

  const needsPillClass = !className?.split(/\s+/).includes('layout-pill')
  const containerClass = className
    ? `${styles.container} ${className}${needsPillClass ? ' layout-pill' : ''}`
    : `${styles.container} layout-pill`

  return (
    <div className={containerClass} role="navigation" aria-label={`${label}のページ切替`}>
      <button
        type="button"
        className={styles.button}
        onClick={handlePrev}
        disabled={disablePrev}
        aria-label={`${label}を前のページへ`}
      >
        前へ
      </button>
      <p className={styles.status} aria-live="polite">
        {label} ページ {normalizedPage} / {normalizedTotal}
      </p>
      <button
        type="button"
        className={styles.button}
        onClick={handleNext}
        disabled={disableNext}
        aria-label={`${label}を次のページへ`}
      >
        次へ
      </button>
    </div>
  )
}

export default PaginationControls

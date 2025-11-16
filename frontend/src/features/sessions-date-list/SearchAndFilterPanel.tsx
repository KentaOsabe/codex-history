import { FormEvent } from 'react'

import DateRangePicker from './DateRangePicker'
import styles from './SearchAndFilterPanel.module.css'
import SearchInput from './SearchInput'

import type { DateRange } from './useSessionsFilters'

export interface SearchAndFilterPanelProps {
  keyword: string
  keywordError?: string
  onKeywordChange: (value: string) => void
  onSubmit: () => void
  isSearchDisabled?: boolean
  dateRange: DateRange
  dateRangeError?: string
  onDateRangeChange: (next: Partial<DateRange>) => void
  onClearFilters: () => void
  className?: string
}

const SearchAndFilterPanel = ({
  keyword,
  keywordError,
  onKeywordChange,
  onSubmit,
  isSearchDisabled = false,
  dateRange,
  dateRangeError,
  onDateRangeChange,
  onClearFilters,
  className,
}: SearchAndFilterPanelProps) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  const errorMessage = keywordError ?? undefined
  const errorId = errorMessage ? 'sessions-search-error' : undefined
  const describedBy = errorMessage ? `${errorId} sessions-date-list-search-help` : 'sessions-date-list-search-help'

  const containerClass = className ? `${styles.container} ${className}` : styles.container

  return (
    <section
      className={containerClass}
      aria-labelledby="sessions-search-panel"
      data-testid="search-and-filter-panel"
    >
      <header className={styles.header}>
        <h2 id="sessions-search-panel">検索とフィルタ</h2>
        <p className={styles.helper}>キーワードと日付範囲でセッションを絞り込みます。</p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.visuallyHidden} htmlFor="sessions-search-input">
          キーワードで検索
        </label>
        <SearchInput
          value={keyword}
          onChange={onKeywordChange}
          className={styles.searchInput}
          inputId="sessions-search-input"
          ariaDescribedBy={describedBy}
          disabled={isSearchDisabled}
        />
        <div className={styles.actions}>
          <button type="submit" className={styles.primaryButton} disabled={isSearchDisabled}>
            検索を実行
          </button>
          <button type="button" className={styles.secondaryButton} onClick={onClearFilters}>
            フィルタをリセット
          </button>
        </div>
        {errorMessage ? (
          <div id={errorId} className={styles.error} role="status" aria-live="assertive">
            {errorMessage}
          </div>
        ) : null}
        <p id="sessions-date-list-search-help" className={styles.hint}>
          2文字以上入力して検索ボタンを押してください。
        </p>
      </form>

      <DateRangePicker dateRange={dateRange} onChange={onDateRangeChange} error={dateRangeError} disabled={isSearchDisabled} />
    </section>
  )
}

export default SearchAndFilterPanel

import { ChangeEvent } from 'react'

import styles from './DateRangePicker.module.css'

import type { DateRange } from './useSessionsFilters'


export interface DateRangePickerProps {
  dateRange: DateRange
  onChange: (next: Partial<DateRange>) => void
  error?: string
  disabled?: boolean
}

const DateRangePicker = ({ dateRange, onChange, error, disabled = false }: DateRangePickerProps) => {
  const handleStartChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ startDate: event.target.value })
  }

  const handleEndChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ endDate: event.target.value })
  }

  const errorId = error ? 'sessions-date-range-error' : undefined

  return (
    <div className={styles.container} aria-live="polite">
      <label className={styles.field} htmlFor="sessions-date-range-start">
        <span className={styles.label}>開始日</span>
        <input
          id="sessions-date-range-start"
          type="date"
          className={styles.input}
          value={dateRange.startDate}
          onChange={handleStartChange}
          aria-describedby={errorId}
          aria-invalid={Boolean(error)}
          disabled={disabled}
        />
      </label>
      <span className={styles.separator} aria-hidden="true">
        〜
      </span>
      <label className={styles.field} htmlFor="sessions-date-range-end">
        <span className={styles.label}>終了日</span>
        <input
          id="sessions-date-range-end"
          type="date"
          className={styles.input}
          value={dateRange.endDate}
          onChange={handleEndChange}
          aria-describedby={errorId}
          aria-invalid={Boolean(error)}
          disabled={disabled}
        />
      </label>
      {error ? (
        <p id={errorId} className={styles.error} role="status">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default DateRangePicker

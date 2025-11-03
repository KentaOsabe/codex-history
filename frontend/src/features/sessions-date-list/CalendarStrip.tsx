import { KeyboardEvent, useEffect, useMemo, useState } from 'react'

import styles from './CalendarStrip.module.css'
import { buildCalendarMatrix, parseISODate, toISODate } from './dateUtils'

interface CalendarStripProps {
  activeDateIso: string
  onSelect: (dateIso: string) => void
  onNavigateMonth: (offset: number) => void
}

const ROW_LENGTH = 7

const formatMonthLabel = (date: Date): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(date)
}

const formatCellLabel = (date: Date): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'UTC',
  }).format(date)
}

const CalendarStrip = ({ activeDateIso, onSelect, onNavigateMonth }: CalendarStripProps) => {
  const activeDate = useMemo(() => parseISODate(activeDateIso), [ activeDateIso ])
  const [ visibleDate, setVisibleDate ] = useState<Date>(activeDate)

  useEffect(() => {
    const sameMonth =
      visibleDate.getUTCFullYear() === activeDate.getUTCFullYear() &&
      visibleDate.getUTCMonth() === activeDate.getUTCMonth()

    if (!sameMonth) {
      setVisibleDate(activeDate)
    }
  }, [ activeDate, visibleDate ])

  const matrix = useMemo(() => buildCalendarMatrix(visibleDate), [ visibleDate ])
  const flatCells = useMemo(() => matrix.flat(), [ matrix ])

  const [ focusDateIso, setFocusDateIso ] = useState<string>(activeDateIso)

  useEffect(() => {
    setFocusDateIso(activeDateIso)
  }, [ activeDateIso ])

  useEffect(() => {
    if (!flatCells.some((cell) => cell.dateIso === focusDateIso)) {
      const fallback = flatCells.find((cell) => cell.isCurrentMonth) ?? flatCells[0]
      if (fallback) {
        setFocusDateIso(fallback.dateIso)
      }
    }
  }, [ flatCells, focusDateIso ])

  const focusIndex = flatCells.findIndex((cell) => cell.dateIso === focusDateIso)

  const moveFocusBy = (offset: number) => {
    const nextIndex = Math.max(0, Math.min(flatCells.length - 1, focusIndex + offset))
    const nextCell = flatCells[nextIndex]
    if (nextCell) {
      setFocusDateIso(nextCell.dateIso)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      moveFocusBy(1)
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      moveFocusBy(-1)
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveFocusBy(-ROW_LENGTH)
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveFocusBy(ROW_LENGTH)
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(focusDateIso)
    }
  }

  const handleMonthNavigation = (offset: number) => {
    const updated = parseISODate(activeDateIso)
    updated.setUTCMonth(updated.getUTCMonth() + offset, 1)

    setVisibleDate(updated)
    setFocusDateIso(toISODate(updated))
    onNavigateMonth(offset)
  }

  const monthLabel = formatMonthLabel(visibleDate)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => handleMonthNavigation(-1)}
        >
          前の月
        </button>
        <h3 className={styles.monthLabel}>{monthLabel}</h3>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => handleMonthNavigation(1)}
        >
          次の月
        </button>
      </div>
      <div role="grid" aria-label="日付選択" className={styles.grid}>
        {matrix.map((week, weekIndex) => (
          <div role="row" className={styles.row} key={`week-${weekIndex}`}>
            {week.map((cell) => {
              const isSelected = cell.dateIso === activeDateIso
              const isFocused = cell.dateIso === focusDateIso
              const classNames = [ styles.cell ]
              if (isSelected) classNames.push(styles.cellSelected)
              if (!cell.isCurrentMonth) classNames.push(styles.cellMuted)

              return (
                <button
                  key={cell.dateIso}
                  type="button"
                  role="gridcell"
                  data-date={cell.dateIso}
                  aria-selected={isSelected}
                  aria-label={formatCellLabel(cell.date)}
                  className={classNames.join(' ')}
                  tabIndex={isFocused ? 0 : -1}
                  onFocus={() => setFocusDateIso(cell.dateIso)}
                  onKeyDown={handleKeyDown}
                  onClick={() => onSelect(cell.dateIso)}
                >
                  {cell.date.getUTCDate()}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default CalendarStrip

import { useCallback } from 'react'

import CalendarStrip from './CalendarStrip'
import { toISODate } from './dateUtils'
import { navigateToSessionDetail } from './navigation'
import SearchInput from './SearchInput'
import SessionList, { type SessionListVariant } from './SessionList'
import styles from './SessionsDateListView.module.css'
import StatusBanner from './StatusBanner'
import { useSessionsViewModel } from './useSessionsViewModel'

const SessionsDateListView = () => {
  const {
    activeDateIso,
    setActiveDateIso,
    status,
    items,
    error,
    searchDraft,
    setSearchDraft,
    refetch,
    lastUpdatedLabel,
  } = useSessionsViewModel()

  const handleDateSelect = useCallback(
    (dateIso: string) => {
      setActiveDateIso(dateIso)
    },
    [setActiveDateIso],
  )

  const handleNavigateMonth = useCallback(
    (offset: number) => {
      const selected = new Date(`${activeDateIso}T00:00:00Z`)
      selected.setUTCMonth(selected.getUTCMonth() + offset, 1)
      setActiveDateIso(toISODate(selected))
    },
    [activeDateIso, setActiveDateIso],
  )

  const listVariant: SessionListVariant = status === 'loading' ? 'loading' : items.length === 0 ? 'empty' : 'ready'

  const handleRetry = useCallback(() => {
    void refetch({ force: true })
  }, [refetch])

  const handleSessionSelect = useCallback((sessionId: string) => {
    navigateToSessionDetail(sessionId)
  }, [])

  return (
    <div className={styles.container}>
      <section className={styles.section} aria-labelledby="sessions-date-list-calendar">
        <h2 id="sessions-date-list-calendar" className={styles.heading}>
          日付を選択
        </h2>
        <CalendarStrip
          activeDateIso={activeDateIso}
          onSelect={handleDateSelect}
          onNavigateMonth={handleNavigateMonth}
        />
      </section>

      <section className={styles.section} aria-labelledby="sessions-date-list-search">
        <h2 id="sessions-date-list-search" className={styles.heading}>
          キーワード検索
        </h2>
        <div className={styles.searchContainer}>
          <label className={styles.visuallyHidden} htmlFor="sessions-date-list-search-input">
            キーワードで検索
          </label>
          <SearchInput
            value={searchDraft}
            onChange={setSearchDraft}
            className={styles.searchInput}
          />
          <p id="sessions-date-list-search-help" className={styles.helperText}>
            検索動作は後続タスクで実装予定です。
          </p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="sessions-date-list-sessions">
        <h2 id="sessions-date-list-sessions" className={styles.heading}>
          セッション一覧
        </h2>
        <StatusBanner
          error={error}
          onRetry={handleRetry}
          isRetrying={status === 'loading'}
        />
        {lastUpdatedLabel ? <p className={styles.metaInfo}>最終更新: {lastUpdatedLabel}</p> : null}
        <SessionList
          variant={listVariant}
          items={items}
          onSelect={handleSessionSelect}
        />
      </section>
    </div>
  )
}

export default SessionsDateListView

import { useMemo, useState } from 'react'

import CalendarStrip from './CalendarStrip'
import { toISODate } from './dateUtils'
import SearchInput from './SearchInput'
import styles from './SessionsDateListView.module.css'
import { useSearchDraft } from './useSearchDraft'

const SessionsDateListView = () => {
  const todayIso = useMemo(() => toISODate(new Date()), [])
  const [ activeDate, setActiveDate ] = useState(todayIso)
  const [ searchDraft, setSearchDraft ] = useSearchDraft('')

  return (
    <div className={styles.container}>
      <section className={styles.section} aria-labelledby="sessions-date-list-calendar">
        <h2 id="sessions-date-list-calendar" className={styles.heading}>
          日付を選択
        </h2>
        <CalendarStrip
          activeDateIso={activeDate}
          onSelect={(dateIso) => setActiveDate(dateIso)}
          onNavigateMonth={(offset) => {
            const selected = new Date(`${activeDate}T00:00:00Z`)
            selected.setUTCMonth(selected.getUTCMonth() + offset, 1)
            setActiveDate(toISODate(selected))
          }}
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
        <div className={styles.sessionsPlaceholder}>
          <p className={styles.placeholderText}>セッションカードは今後のタスクで追加されます。</p>
        </div>
      </section>
    </div>
  )
}

export default SessionsDateListView

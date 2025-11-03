import { useMemo, useState } from 'react'

import { toISODate } from './dateUtils'
import styles from './SessionsDateListView.module.css'

const SessionsDateListView = () => {
  const todayIso = useMemo(() => toISODate(new Date()), [])
  const [activeDate] = useState(todayIso)

  return (
    <div className={styles.container}>
      <section className={styles.section} aria-labelledby="sessions-date-list-calendar">
        <h2 id="sessions-date-list-calendar" className={styles.heading}>
          日付を選択
        </h2>
        <div className={styles.calendarPlaceholder}>
          <span className={styles.calendarActiveDate} data-testid="active-date">
            {activeDate}
          </span>
          <p className={styles.placeholderText}>カレンダー UI は今後のタスクで実装されます。</p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="sessions-date-list-search">
        <h2 id="sessions-date-list-search" className={styles.heading}>
          キーワード検索
        </h2>
        <div className={styles.searchContainer}>
          <label className={styles.visuallyHidden} htmlFor="sessions-date-list-search-input">
            キーワードで検索
          </label>
          <input
            id="sessions-date-list-search-input"
            className={styles.searchInput}
            type="text"
            placeholder="キーワードで検索"
            aria-describedby="sessions-date-list-search-help"
            readOnly
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

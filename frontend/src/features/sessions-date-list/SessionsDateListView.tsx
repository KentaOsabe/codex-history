import { useCallback, useMemo, useState } from 'react'

import CalendarStrip from './CalendarStrip'
import { toISODate } from './dateUtils'
import SearchInput from './SearchInput'
import SessionList, { type SessionListItem } from './SessionList'
import styles from './SessionsDateListView.module.css'
import { useSearchDraft } from './useSearchDraft'

const STUB_SESSIONS: SessionListItem[] = [
  {
    id: 'demo-session-1',
    title: 'デモセッション: サマリー付き',
    fallbackLabel: '2025/03/14/demo-session-1.jsonl',
    updatedAtLabel: '2025年3月14日 22:15',
    messageCount: 58,
    summary: 'サニタイズ済みの要約とツール呼び出しを含む会話です。ログ検索や再利用の起点にどうぞ。',
    hasSanitized: true,
  },
  {
    id: 'demo-session-2',
    title: 'バックエンド調査メモ',
    fallbackLabel: '2025/03/10/backend-notes.jsonl',
    updatedAtLabel: '2025年3月10日 09:05',
    messageCount: 31,
    summary: 'Codex History の API 応答を検証したメモ。SQL ログと比較しながらまとめています。',
    hasSanitized: false,
  },
]

const SessionsDateListView = () => {
  const todayIso = useMemo(() => toISODate(new Date()), [])
  const [ activeDate, setActiveDate ] = useState(todayIso)
  const [ searchDraft, setSearchDraft ] = useSearchDraft('')
  const [ sessions ] = useState(STUB_SESSIONS)
  const handleSelectSession = useCallback((sessionId: string) => {
    // TODO: ルーティング実装時にセッション詳細ページへ遷移する
    console.info('selected session id:', sessionId)
  }, [])

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
        <SessionList variant="ready" items={sessions} onSelect={handleSelectSession} />
      </section>
    </div>
  )
}

export default SessionsDateListView

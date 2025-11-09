import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom'

import styles from './App.module.css'

const AppErrorBoundary = () => {
  const routeError: unknown = useRouteError()
  const navigate = useNavigate()

  const statusLabel = isRouteErrorResponse(routeError) ? `HTTP ${routeError.status}` : '不明なエラー'
  const detailMessage = (() => {
    if (isRouteErrorResponse(routeError)) {
      if (routeError.statusText) {
        return routeError.statusText
      }
      if (routeError.data) {
        return String(routeError.data)
      }
      return ''
    }
    if (routeError instanceof Error) {
      return routeError.message
    }
    return ''
  })()

  return (
    <main className={styles.app}>
      <header className={styles.hero}>
        <h1 className={styles.title}>Codex会話履歴ビューア</h1>
        <p className={styles.lead}>日付を選択するとその日のセッションが表示されます</p>
      </header>
      <section className={styles.errorSection} aria-live="assertive">
        <h2 className={styles.errorTitle}>表示に失敗しました</h2>
        <p className={styles.errorSummary}>{statusLabel}</p>
        {detailMessage ? <p className={styles.errorDetail}>{String(detailMessage)}</p> : null}
        <div className={styles.errorActions}>
          <button type="button" onClick={() => { void navigate('/') }} className={styles.backButton}>
            一覧に戻る
          </button>
        </div>
      </section>
    </main>
  )
}

export default AppErrorBoundary

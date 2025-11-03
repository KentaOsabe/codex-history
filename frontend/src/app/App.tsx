import SessionsDateListView from '@/features/sessions-date-list/SessionsDateListView'

import styles from './App.module.css'

const App = () => {
  return (
    <main className={styles.app}>
      <header className={styles.hero}>
        <h1 className={styles.title}>Codex会話履歴ビューア</h1>
        <p className={styles.lead}>日付を選択するとその日のセッションが表示されます</p>
      </header>
      <SessionsDateListView />
    </main>
  )
}

export default App

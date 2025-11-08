import { Outlet } from 'react-router-dom'

import styles from './App.module.css'

const AppLayout = () => {
  return (
    <main className={styles.app}>
      <header className={styles.hero}>
        <h1 className={styles.title}>Codex会話履歴ビューア</h1>
        <p className={styles.lead}>日付を選択するとその日のセッションが表示されます</p>
      </header>
      <section className={styles.content}>
        <Outlet />
      </section>
    </main>
  )
}

export default AppLayout


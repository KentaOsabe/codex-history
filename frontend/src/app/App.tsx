import { env } from '@/config/env'

import styles from './App.module.css'

const App = () => {
  return (
    <main className={styles.app}>
      <header className={styles.hero}>
        <h1 className={styles.title}>Codex会話履歴ビューア</h1>
        <p className={styles.lead}>日付を選択するとその日のセッションが表示されます</p>
      </header>
      <section className={styles.placeholder}>
        <h2 className={styles.placeholderHeading}>次のステップ</h2>
        <ol className={styles.placeholderList}>
          <li>バックエンドが提供するAPIの仕様を確認し、フェッチクライアントの設計を進めましょう。</li>
          <li>
            サンプルデータを用いた一覧ビューと詳細ビューのワイヤーフレームを固めましょう。
            デフォルトでは直近{env.defaultDateRange}日分を読み込む想定です。
          </li>
          <li>UI部品を`components/`に切り出し、TDDで振る舞いを保証しながら組み立てましょう。</li>
        </ol>
      </section>
    </main>
  )
}

export default App

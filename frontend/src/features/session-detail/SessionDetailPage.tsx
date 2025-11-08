import { Link, useParams } from 'react-router-dom'

import styles from './SessionDetailPage.module.css'

const SessionDetailPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const resolvedSessionId = sessionId ?? '(未指定)'

  return (
    <article className={styles.container} aria-live="polite">
      <header className={styles.header}>
        <span className={styles.badge}>Preview</span>
        <h2 className={styles.title}>セッション詳細ビュー（開発中）</h2>
        <p className={styles.subtitle}>
          セッションID: <span className={styles.sessionId}>{resolvedSessionId}</span>
        </p>
      </header>
      <section className={styles.placeholder} data-testid="session-detail-placeholder">
        <p className={styles.placeholderId}>
          選択中: <code>{resolvedSessionId}</code>
        </p>
        <p>詳細ビューの実装は issue-21 の後続タスクで段階的に進めています。</p>
        <ul>
          <li>メッセージタイムラインと variant 切替</li>
          <li>ツール呼び出しログと暗号化 reasoning プレースホルダー</li>
          <li>仮想スクロールと遅延ロード</li>
        </ul>
        <p>仕様の確定後、このページにメッセージコンテンツが表示されます。</p>
      </section>
      <div className={styles.actions}>
        <Link to="/" className={styles.backLink}>
          セッション一覧へ戻る
        </Link>
      </div>
    </article>
  )
}

export default SessionDetailPage

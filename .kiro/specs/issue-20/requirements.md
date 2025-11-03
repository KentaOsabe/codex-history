# 要件ドキュメント

## はじめに
Sessions Date List View は、直近の Codex セッションへカレンダーベースでアクセスできる導線として、日付フィルタ、カード表示、検索フィールドの準備状態、堅牢なデータハンドリングを組み合わせ、ナレッジワーカーが素早く作業を再開できるようにする必要がある。

## 要件

### 要件1: 日付ドリブンなセッション一覧
**目的:** リピートユーザーとして、余計な操作なしに最新作業へ戻れるよう、ビューが自動的に正しい日付を表示してほしい。

#### 受け入れ基準
1. WHEN Sessions Date List View がマウントされたとき THEN Sessions Date List View SHALL 当日の日付をアクティブにし、その日付のセッションを取得する。
2. WHEN ユーザーが別の日付を選択したとき THEN Sessions Date List View SHALL 選択日付をハイライトし、その日付に絞ったセッション一覧へ更新する。
3. IF 選択された日付にセッションが存在しないとき THEN Sessions Date List View SHALL セッションカードの代わりに定義済みの空状態メッセージを表示する。

### 要件2: セッションカードの表示
**目的:** ナレッジワーカーとして、各セッションカードから重要なメタデータが伝わり、どの会話を開くか判断したい。

#### 受け入れ基準
1. WHEN セッションカードがレンダリングされるとき THEN Sessions Date List View SHALL セッションタイトルを表示し、タイトルがない場合は元ファイル名をフォールバック表示する。
2. WHEN セッションメタデータが存在するとき THEN Sessions Date List View SHALL ローカライズされた最終更新日時と総メッセージ数をカード上に表示する。
3. IF セッションにサマリーが含まれるとき THEN Sessions Date List View SHALL サマリーをカード内に1〜2行でトリミングして表示する。
4. WHEN ユーザーがセッションカードを操作するとき THEN Sessions Date List View SHALL 設定されたセッション詳細ルートのプレースホルダーへ遷移をトリガーする。

### 要件3: 検索入力の準備状態
**目的:** セッションを絞り込む準備をするユーザーとして、将来の検索機能に備えたキーワード入力欄がすぐ使える状態であってほしい。

#### 受け入れ基準
1. WHEN Sessions Date List View がレンダリングされるとき THEN Sessions Date List View SHALL プレースホルダー文字列「キーワードで検索」を表示する検索入力を含める。
2. WHEN ユーザーが検索入力に文字を入力するとき THEN Sessions Date List View SHALL 入力された文字列をローカルステートに保持し、検索リクエストは発行しない。
3. WHEN 同一訪問中にユーザーが再び検索入力へフォーカスを戻すとき THEN Sessions Date List View SHALL ユーザーがクリアするまで以前の入力内容を保持する。

### 要件4: ローディング・エラー・データライフサイクル
**目的:** プロダクト利用者として、データ状態が明確に伝わり、失敗時も安心して再試行できるリストを求める。

#### 受け入れ基準
1. WHEN セッション取得が進行中のとき THEN Sessions Date List View SHALL 一覧をローディングスケルトンまたはスピナーに置き換える。
2. WHEN セッション取得に失敗したとき THEN Sessions Date List View SHALL リトライ操作を備えたエラーメッセージを表示する。
3. WHEN ユーザーがリトライ操作を行うとき THEN Sessions Date List View SHALL 現在選択されている日付のセッションを再取得し、成功後にビューを更新する。
4. WHILE 選択日付が変化しないあいだ THE Sessions Data Layer SHALL 直近の成功レスポンスを再利用し、冗長なネットワークリクエストを避ける。

### 要件5: 自動化された検証
**目的:** フロントエンドエンジニアとして、ビューの回帰をTDDで確実に検知できる決定論的なテストがほしい。

#### 受け入れ基準
1. WHEN コンポーネントテストスイートを実行するとき THEN Sessions Date List View Test Suite SHALL モックしたAPIレスポンスを用いて、初期日の表示、日付変更時の再取得、ゼロ件時の空状態、検索入力の状態更新、エラー時リトライ挙動を検証する。
2. WHEN セッションAPIのテストダブルが呼び出しを記録するとき THEN Sessions Date List View Test Suite SHALL 選択日付と一致する start_date / end_date パラメータが送信されていることを検証する。
3. IF 新たなユーザー可視状態が導入されるとき THEN Engineering Team SHALL リリース前に対応するテストを追加する。

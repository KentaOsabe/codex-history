# Requirements Document

## Project Description (Input)
Issue #23 では、Codex History フロントエンドに検索・フィルタリング UX を追加し、既存のセッション一覧ビュー上で大量セッションを素早く絞り込めるようにする。バックエンドの `GET /api/search` と `GET /api/sessions` のフィルタ機能を活用し、キーワード検索、日付範囲フィルタ、ページネーション、ローディング・エラー表示、および MSW/Vitest による TDD を完備することが求められている。

## Requirements

### Requirement 1: キーワード検索入力と検索API連携
**Objective:** As a セッション探索ユーザー, I want キーワード検索を実行して該当メッセージを見つけたい, so that 必要な会話へすぐ遷移できる。

#### Acceptance Criteria
1. WHEN ユーザーが2文字以上のキーワードを入力して Enter または検索ボタンを押下したとき THEN フロントエンド SHALL `GET /api/search?keyword=<trimmed>` を呼び出し、入力中の余白を除去してクエリを送信する。
2. IF 入力が空文字・1文字・空白のみの場合 THEN フロントエンド SHALL バリデーションメッセージを表示し、API 呼び出しを行わない。
3. WHEN 検索レスポンスが返却されたとき THEN セッション一覧ビュー SHALL `data[].attributes.highlight` / `session_id` / `occurred_at` を用いた検索結果カードを描画し、既存セッションカードとのコンテキストを保ったまま並べ替える。
4. WHILE 検索リクエストが進行中の間 THEN 検索入力と実行ボタン SHALL 非活性化され、スケルトンまたはスピナーでロード状態を示す。

### Requirement 2: 日付範囲フィルタと一覧API連携
**Objective:** As a ログ閲覧者, I want 任意の期間でセッションをフィルタしたい, so that 関連期間の会話だけに集中できる。

#### Acceptance Criteria
1. WHEN ユーザーが日付ピッカーで開始日・終了日を選択したとき THEN フロントエンド SHALL `GET /api/sessions?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` を呼び出し、レスポンスの `meta.filters` を UI に反映する。
2. IF 開始日が終了日より後の場合 THEN フロントエンド SHALL エラートーストまたはフォームエラーを表示し、API コールをキャンセルする。
3. WHEN ユーザーがフィルタを解除したとき THEN セッション一覧ビュー SHALL 既定の期間（例: 直近7日）に戻し、自動で再フェッチする。
4. WHERE 日付フィルタとキーワード検索が同時に適用されている場合 THEN クエリストリング SHALL 両方の条件を含み、UI バッジでアクティブフィルタを可視化する。

### Requirement 3: 検索結果とセッション一覧の統合表示
**Objective:** As a 一覧ビュー利用者, I want 検索結果を既存カードに統合して扱いたい, so that 別画面に遷移せずに結果を比較できる。

#### Acceptance Criteria
1. WHEN 検索結果が存在するとき THEN セッション一覧ビュー SHALL ヒットしたセッションごとにカードを生成し、`SessionCard` 既存スタイルでハイライトスニペットとタイムスタンプを表示する。
2. IF 検索結果が同一セッションに複数存在する場合 THEN ビュー SHALL 先頭カードに「n 件ヒット」バッジを表示し、クリックで該当セッション詳細 (`/sessions/:id`) に移動する。
3. WHEN ユーザーが検索条件をクリアしたとき THEN ビュー SHALL 元の日付グルーピング／ページネーションに戻し、検索結果カードを即座に除去する。
4. WHERE 検索結果に `links.session` が付与されている場合 THEN カードの詳細リンク SHALL その URL を使用し、タブキー操作でもアクセス可能にする。

### Requirement 4: ページネーションとローディング状態
**Objective:** As a UX 監視者, I want ページ遷移やローディング状態が明確であってほしい, so that 大量結果でも迷わず操作できる。

#### Acceptance Criteria
1. WHEN 検索 API の `meta.pagination.total_pages` が 2 以上のとき THEN UI SHALL ページャ（前へ/次へ・ページ番号）を表示し、クリック時に対応する `page` パラメータで再リクエストする。
2. WHEN 一覧 API の `meta.pagination` が更新されたとき THEN ページャ SHALL 同期し、現在ページを ARIA 属性付きで強調する。
3. WHILE いずれかのページングリクエストが処理中の場合 THEN 現在ページのカードは透過スケルトンを表示し、連続クリックを防止するためにページャを一時的に無効化する。
4. WHERE ページサイズを切り替える UI を提供する場合 THEN フロントエンド SHALL `limit`（検索）または `per_page`（一覧）を更新し、選択値を永続化する。

### Requirement 5: エラー・ゼロ件時のハンドリング
**Objective:** As a 信頼性重視ユーザー, I want エラーやヒット0件時も状況を把握したい, so that 次のアクションを判断できる。

#### Acceptance Criteria
1. WHEN API が 4xx/5xx を返却したとき THEN UI SHALL `errors[].title/detail` を含むエラーバナーを表示し、「再試行」操作を提供する。
2. IF ネットワーク障害でタイムアウトした場合 THEN フロントエンド SHALL 直前の結果を保持しつつ、再試行ボタンとタイムスタンプ付きの警告を表示する。
3. WHEN 検索結果が 0 件のとき THEN UI SHALL 「該当する会話が見つかりません」メッセージと、フィルタ解除やキーワード修正のヒントを表示する。
4. WHERE 422 (`invalid_parameters`) が発生した場合 THEN 問題となったフィールド（例: `keyword`, `start_date`）をフォーム上で強調表示する。

### Requirement 6: TDD とテスト範囲
**Objective:** As a フロントエンド開発者, I want TDD と網羅的テストで回帰を防ぎたい, so that 検索 UX の信頼性を維持できる。

#### Acceptance Criteria
1. WHEN 新規機能を実装するとき THEN 開発者 SHALL Vitest + Testing Library + MSW で失敗するテストを先に追加し、Red→Green→Refactor を完了させる。
2. WHEN テストスイートを実行するとき THEN `npm run test` SHALL キーワード検索、日付フィルタ、ページネーション、エラー/ゼロ件表示のケースをすべて検証する。
3. IF デバウンスや同時リクエスト抑止ロジックを導入する場合 THEN テスト SHALL 競合リクエストが単一レスポンスで解決されることを保証する。
4. WHEN CI が走るとき THEN 追加した検索関連テスト SHALL MSW モックを用いて 200/400/500 応答とタイムアウトケースを自動検証する。


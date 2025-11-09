# Requirements Document

## Introduction
Issue #22 では、セッション詳細ビューにツール呼び出し履歴とメタイベントを参照できる詳細タブを追加し、技術的トレースや JSON ペイロードを安全に閲覧できるようにする。function_call 系イベントを call_id で結び、event_msg もカテゴリ別に整理することで、ログ閲覧者がツール挙動と内部メトリクスを確認しやすくする。表示される JSON / HTML は SafeList 方針でサニタイズし、TDD に従って表示ロジックとサニタイズ挙動を検証する。

## Requirements

### Requirement 1: 詳細タブのナビゲーション
**Objective:** As a セッション閲覧者, I want セッション詳細画面でメッセージタイムラインと技術的詳細をタブで切り替えられるようにしたい, so that コンテキストを失わずにツール呼び出し情報へアクセスできる。

#### Acceptance Criteria
1. WHEN SessionDetailView がレンダリングされたとき THEN SessionDetailView SHALL "会話"（既存タイムライン）と "詳細"（新タブ）の 2 つ以上のタブを表示する。
2. WHEN ユーザーが 詳細タブ を選択したとき THEN SessionDetailView SHALL ツール呼び出し履歴とメタイベント一覧を一体的に表示し、会話タブは非アクティブ表示に切り替える。
3. IF 画面幅が小さい場合 THEN SessionDetailView SHALL タブ操作をキーボードとスクリーンリーダーで操作できる ARIA 属性（role="tablist" など）を維持する。

### Requirement 2: ツール呼び出し履歴の結合表示
**Objective:** As a ログ閲覧者, I want function_call 系イベントを call_id ごとにまとまった形で確認したい, so that ツールの入力と出力を容易に追跡できる。

#### Acceptance Criteria
1. WHEN セッション詳細レスポンスに function_call / function_call_output / custom_tool_call / custom_tool_call_output が含まれるとき THEN SessionDetailView SHALL 同一 call_id で1つのカードにまとめ、呼び出し種別・call_id・開始/終了タイムスタンプを表示する。
2. IF 呼び出し元引数 (`arguments`, `payload`) が JSON の場合 THEN SessionDetailView SHALL 折りたたみ可能な JSON ビューアを提供し、初期状態では 3 行以内にトリミングした要約を表示する。
3. WHEN call_id に対応する出力イベントが存在しない場合 THEN SessionDetailView SHALL 未完了ステータスを表示し、出力セクションを "出力なし" として明示する。
4. IF 同一セッション内に複数の call_id が存在する場合 THEN SessionDetailView SHALL 呼び出し時刻昇順で並べ、キーボードフォーカス順序も同じ順番になるよう制御する。

### Requirement 3: メタイベント表示とグルーピング
**Objective:** As a テクニカルトレーサー, I want event_msg を種類ごとに整理して見たい, so that token_count や agent_reasoning の推移を素早く把握できる。

#### Acceptance Criteria
1. WHEN event_msg が存在するとき THEN SessionDetailView SHALL `token_count`, `agent_reasoning`, `plain`, `environment_context` など known kind をカテゴリ見出しでグループ化し、タイムスタンプ昇順で並べる。
2. IF event_msg.kind が未対応の値であっても THEN SessionDetailView SHALL "その他" グループにフォールバックし、kind 名と原文を表示する。
3. WHEN token_count イベントを表示するとき THEN SessionDetailView SHALL 入力/出力トークン数・合計を数値フォーマットで表示し、メッセージ本文とは異なるスタイルを適用する。
4. IF agent_reasoning イベントが暗号化フラグを持つ場合 THEN SessionDetailView SHALL Requirement 4 のサニタイズポリシーと同じプレースホルダーを表示し、平文を表示しない。

### Requirement 4: サニタイズと JSON 表示の安全性
**Objective:** As a 情報管理担当者, I want 詳細タブに表示される JSON や HTML 断片が安全にサニタイズされてほしい, so that 危険なスクリプトを実行せずに技術情報を共有できる。

#### Acceptance Criteria
1. WHEN JSON ビューアが展開されるとき THEN SessionDetailView SHALL SafeList ベースのサニタイズを適用し、`script`, `on*` 属性、`javascript:` スキームなどを削除する。
2. IF サニタイズ処理で除去対象が検知された場合 THEN SessionDetailView SHALL ユーザーに "安全のため一部の内容をマスクしました" などのインラインメッセージを表示する。
3. WHEN ユーザーが JSON 折りたたみトグルを切り替えるとき THEN SessionDetailView SHALL 状態を各 call_id / event エントリ単位で保持し、再レンダリング後も展開状態を復元する。
4. IF 生データが 10KB を超える場合 THEN SessionDetailView SHALL 展開時のみ遅延レンダリングし、最初の描画では "展開して読み込む" プレースホルダーを表示する。

### Requirement 5: TDD とテスト範囲
**Objective:** As a フロントエンド開発者, I want 詳細タブのロジックとサニタイズ挙動をテストで担保したい, so that 回帰なくリグレッションを検知できる。

#### Acceptance Criteria
1. WHEN 新機能を実装するとき THEN FrontendTestSuite SHALL まず失敗するテスト（Red）を追加し、グリーン化後にリファクタリングする手順を issue-22 の全サブタスクで適用する。
2. WHEN コンポーネントテストを実行するとき THEN FrontendTestSuite SHALL call_id グルーピング、未完了呼び出し、未知 kind フォールバック、サニタイズ警告、JSON 折りたたみ状態保持を検証するケースを含む。
3. IF サニタイズロジックが危険な HTML を除去できない場合 THEN FrontendTestSuite SHALL 失敗し、除去すべきタグ/属性を明示したエラーメッセージを返す。
4. WHEN CI 上でテストが走るとき THEN FrontendTestSuite SHALL 詳細タブに関する新規テストが `npm run test` に統合されていることを確認する。


# Requirements Document

## Introduction
Codex History の閲覧者が選択したセッションの対話内容を追跡しやすくし、長文でも快適に閲覧できるセッション詳細ビューを提供する。メッセージの種別やメタ情報に応じた表示制御と仮想スクロールによって、機能性とパフォーマンスを両立させることを目的とする。

## Requirements

### Requirement 1: セッション詳細メッセージ表示
**Objective:** As a ログ閲覧者, I want 選択したセッションのメッセージを発言の流れどおりに読めるようにしたい, so that 会話の意図と時系列を把握できる。

#### Acceptance Criteria
1. WHEN ユーザーがセッション詳細ビューを開いたとき THEN SessionDetailView SHALL 選択されたセッションのメッセージをタイムスタンプ昇順で一覧表示する。
2. IF メッセージに role 情報が含まれる場合 THEN SessionDetailView SHALL 発言者ラベルをメッセージと一緒に表示する。
3. WHEN メッセージがタイムスタンプを持つとき THEN SessionDetailView SHALL タイムスタンプをローカルタイムゾーンに変換して併記する。
4. WHERE メッセージがサニタイズ済み HTML を保持する場合 THE SessionDetailView SHALL サニタイズ済み本文を優先してレンダリングする。

### Requirement 2: センシティブメッセージのプレースホルダー表示
**Objective:** As a 情報管理を重視する閲覧者, I want 暗号化された reasoning メッセージが誤って表示されないようにしたい, so that センシティブな内容を安全に扱える。

#### Acceptance Criteria
1. IF メッセージ種別が reasoning かつ暗号化フラグが有効な場合 THEN SessionDetailView SHALL プレースホルダー文言だけを表示する。
2. WHEN ユーザーが reasoning プレースホルダーの詳細表示操作を試みたとき THEN SessionDetailView SHALL 内容がマスクされていることを明示する。
3. IF メッセージ種別が reasoning でも暗号化フラグが無効な場合 THEN SessionDetailView SHALL プレーンテキスト本文を表示する。

### Requirement 3: メッセージ仮想スクロール
**Objective:** As a ログ閲覧者, I want 長いメッセージリストでも滑らかにスクロールしたい, so that パフォーマンスを損なわずに会話の全体を把握できる。

#### Acceptance Criteria
1. WHEN メッセージ数が仮想化閾値を超えたとき THEN SessionDetailView SHALL メッセージを仮想スクロール領域にレンダリングする。
2. WHILE ユーザーが仮想スクロール領域を操作している間 THE SessionDetailView SHALL 可視範囲とバッファ範囲のメッセージだけを DOM に保持する。
3. IF ユーザーがスクロール位置で上下端に到達した場合 THEN SessionDetailView SHALL 遅延ロードで隣接メッセージを読み込む。
4. WHEN 仮想スクロールがレンダリング範囲を更新したとき THEN SessionDetailView SHALL 現在のスクロールオフセットを維持する。

### Requirement 4: テストと品質保証
**Objective:** As a フロントエンド開発者, I want テストで描画要件と仮想化挙動を担保したい, so that 回帰を防ぎながら TDD を実践できる。

#### Acceptance Criteria
1. WHEN SessionDetailView のメッセージ表示機能を実装するとき THEN FrontendTestSuite SHALL Red→Green→Refactor の順序でテストを追加する。
2. IF メッセージレンダリング仕様が更新された場合 THEN FrontendTestSuite SHALL 全メッセージタイプを検証するテストを維持する。
3. WHEN 仮想スクロール挙動を実装したとき THEN FrontendTestSuite SHALL スクロール操作に応じてレンダリングが切り替わるシナリオテストを提供する。

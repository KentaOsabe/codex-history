# Requirements Document

## Project Description (Input)
Issue #24 では、Codex History の UI テーマを Bootstrap ベースのトークン体系で統一し、主要ページがデスクトップからタブレット/モバイル幅までレスポンシブに崩れないよう整備することを目的とする。カラーパレットとタイポグラフィを整理した上で、ライト/ダークテーマ切り替えの要否を判断し、必要であれば実装する。また、Storybook 等でコンポーネント単位のスタイルガイドを用意し、画面幅ごとの挙動を TDD（Red→Green→Refactor）で検証可能にする必要がある。

## Requirements

### Requirement 1: Bootstrap互換テーマトークンとタイポグラフィ
**Objective:** As a UI/テーマ管理者, I want プロダクト全体で一貫したカラーとタイポグラフィを適用したい, so that コンポーネント間でのスタイル差異をなくし保守性を高められる。

#### Acceptance Criteria
1. WHEN フロントエンドのグローバルスタイルがロードされるとき THEN `:root` には Bootstrap のカラー体系（primary/secondary/success/info/warning/danger/light/dark）を最低 4 段階（base/hover/active/subtle）で表現する CSS カスタムプロパティと、表面/境界/文字色用のセマンティックトークン（`--theme-surface-default` 等）が定義され、`body`, `Navbar`, `SessionCard`, `StatusBanner` はリテラルカラーを使わずトークンのみで配色される。
2. WHEN CSS ビルドが完了したとき THEN `--theme-font-body`, `--theme-font-heading`, `--theme-font-mono` の 3 系統のフォントトークンが設定され、`font-family` / `font-weight` / `line-height` / `letter-spacing` のスケールが README もしくは `docs/styleguide.md` に表形式で掲載されている。
3. IF 文字色と背景色の組み合わせがアクセシビリティ閾値を下回る場合 THEN L*a*b* コントラスト比 4.5:1 を満たすようトークン値を更新し、`npm run lint:style` もしくは Storybook のアクセシビリティアドオンで検出できるチェックリストが整備される。
4. WHEN テーマトークンを参照する開発者向けドキュメントを確認するとき THEN `docs/theme-tokens.md` (新規 or 既存) には各トークン名・役割・Bootstrap 既定値との差分が記載され、ライト/ダーク双方のプレビュー画像が貼付されている。

### Requirement 2: 主要ページのレスポンシブレイアウト
**Objective:** As a クロスデバイス利用者, I want 画面幅に応じてセッション一覧やパネルが最適化されてほしい, so that ウィンドウ幅が変化しても操作感が損なわれない。

#### Acceptance Criteria
1. WHEN ビューポート幅が `≥1200px (xl)` のとき THEN `SessionsDateListView` は左カラムに検索/フィルタパネル、右カラムにリストを 8:16 の比率で表示し、`SessionCard` グリッドは 2 カラムで均等配置される。
2. WHEN 幅が `768px〜1199px (md-lg)` のとき THEN フィルタパネルはリスト上部にスタックし、ページャは横スクロールなしで 100% 幅に収まる。`StatusBanner` は折り返し表示されても余白 16px を保持する。
3. WHEN 幅が `<576px (xs)` のとき THEN 全コンポーネントは単一カラムになり、ヘッダーナビゲーションはハンバーガー（もしくは `overflow menu`）に畳まれ、画面横スクロールが発生しない。
4. WHEN Storybook もしくは Playwright でブレークポイントごとのスナップショットテストを実行したとき THEN `SessionsDateListView`, `SessionDetail`, `SearchAndFilterPanel` の 3 画面はすべてのブレークポイントでエラー無しにレンダリングされ、CI 上で比較できる画像/DOM スナップショットが保存される。

### Requirement 3: ライト/ダークテーマ切り替えの意思決定と実装
**Objective:** As a テーマ利用者, I want ライト/ダークテーマの可否を明確にしたい, so that 使用環境や好みに応じて視認性を確保できる。

#### Acceptance Criteria
1. WHEN issue-24 の仕様がレビューされるとき THEN `.kiro/specs/issue-24/decisions.md` もしくは `docs/theme_toggle.md` にライト/ダークテーマ可否に関する決定記録（目的・評価指標・採否理由・影響範囲）が追記されている。
2. IF ダークテーマを実装する決定が下された場合 THEN ヘッダーバーに `data-testid="theme-toggle"` を持つトグルが表示され、`prefers-color-scheme` を初期値として `localStorage` に永続化し、トグル操作時に `<body data-theme="dark">` が 50ms 以内に適用される。
3. IF ダークテーマを見送る決定となった場合 THEN 決定記録にはリリース阻害要因と再検討条件が明記され、README の FAQ もしくは Style Guide に「現時点ではライトテーマのみを公式サポート」する旨が記載される。
4. WHEN テーマを切り替えたとき THEN `SearchAndFilterPanel`, `SessionCard`, `StatusBanner`, `CodeSnippet` の 4 コンポーネントが同時に色調を切り替え、ARIA 属性（`aria-pressed` や `aria-live`）が最新状態に保たれることを Vitest もしくは Storybook Interaction Test で検証する。

### Requirement 4: スタイルガイドと Storybook ドキュメント
**Objective:** As a デザイナー/開発者, I want コンポーネント単位でテーマ適用状態を確認できるスタイルガイドがほしい, so that UI 変更時に差分を素早く把握できる。

#### Acceptance Criteria
1. WHEN `npm run storybook` を実行したとき THEN Storybook がエラーなく起動し、グローバルな `ThemeProvider` デコレーター経由でライト/ダーク切り替えとブレークポイント切り替え (viewport アドオン) が操作できる。
2. WHEN Storybook 内の `Sessions/SessionsDateListView`, `Sessions/SessionCard`, `Navigation/AppShell`, `Feedback/StatusBanner` の各ストーリーを閲覧するとき THEN Controls パネルから `theme` と `breakpoint` を変更でき、Knobs/Docs で使用トークンが表示される。
3. WHEN `npm run build-storybook` を CI で実行するとき THEN 静的 Storybook 出力が `frontend/storybook-static/` に生成され、Artifacts もしくは `docs/styleguide.md` から参照できる URL が記載される。
4. WHEN 開発者がスタイルガイドを参照するとき THEN `docs/styleguide.md` (新規) にレイアウトルール、トークン参照方法、Storybook のセットアップ手順、レスポンシブ検証手順 (ブラウザ/Playwright/Storybook アドオン) が整理されている。

### Requirement 5: TDD とレスポンシブ挙動テスト
**Objective:** As a フロントエンド開発者, I want レスポンシブとテーマ機能を TDD で担保したい, so that 回帰を自動検知できる。

#### Acceptance Criteria
1. WHEN issue-24 の実装に着手するとき THEN `frontend/src/features/ui-theme/__tests__` と `frontend/src/features/layout/__tests__` にライト/ダーク切り替え・ブレークポイント挙動を先に失敗させるテストが追加され、その後実装でグリーンにする Red→Green→Refactor 手順が PR 説明に記録される。
2. WHEN `npm run test` を実行するとき THEN 追加されたテストが `matchMedia` モック経由で `xs/sm/md/lg/xl` 各幅を再現し、`SessionCard` のクラス/DOM 変更とテーマ属性変更を検証する。
3. WHEN CI が走るとき THEN Storybook Test Runner もしくは Playwright Screenshot Test が 3 つ以上の画面幅で差分検知を行い、失敗時には差分画像が添付される。
4. IF テストで検出されたテーマ/レスポンシブの不具合が修正された場合 THEN 対応するテストケースに不具合内容と再発防止目的を示すコメントを追加し、README の「テスト実行」節に `npm run test -- theme responsive` (新設スクリプト可) の説明を追記する。

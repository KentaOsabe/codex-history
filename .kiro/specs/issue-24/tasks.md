# Implementation Plan

- [x] 1. テーマトークンとタイポグラフィ基盤を整備する
  - `frontend/src/styles/theme/` に `tokens.css`, `typography.css`, `dark.css` を新設し、Bootstrap 互換の色・フォントスケールを CSS 変数化する
  - Vite エントリでインポートしつつ `docs/theme-tokens.md` にトークン表とアクセシビリティ要件 (4.5:1) を追記する
  - 既存 CSS Modules（`SessionsDateListView`, `StatusBanner`, `SessionCard` など）のリテラルカラー/フォント指定を `var(--theme-*)` に置換し、Stylelint ルールで逸脱を検知できるよう設定する
  - _Requirements: 1_

- [x] 1.1 Stylelint/ESLint にテーマトークン利用ガードを追加する
  - `stylelint.config.mjs` へカスタムルール (例: 禁止色リスト + `color-no-hex`) を追加し、`npm run lint:style` で検証する
  - `eslint.config.js` に CSS Modules 内の直書きカラーを禁止するプラグイン設定や codemod を導入し、CI で強制する
  - _Requirements: 1,5_

- [x] 2. ThemeProvider と ThemeToggle を実装し、意思決定を文書化する
  - `frontend/src/features/ui-theme/ThemeProvider.tsx` と `ThemeContext` を作成し、`prefers-color-scheme` と `localStorage` を統合して `<body data-theme>` を制御する（50ms 以内更新）
  - `ThemeToggle` コンポーネントを `AppShell` に組み込み、`data-testid="theme-toggle"` や `aria-pressed` を備えた操作を提供する
  - `.kiro/specs/issue-24/decisions.md` or `docs/theme_toggle.md` にライト/ダーク採否・理由・再検討条件を記録し、README/FAQ にサポート状況を追記する
  - _Requirements: 1,3,4_

- [x] 3. レスポンシブレイアウト基盤を導入し主要画面を更新する
  - `useResponsiveLayout` フックと `ResponsiveGrid` を `frontend/src/features/layout/` に追加し、Bootstrap 基準のブレークポイント定義を共通化する
  - `SessionsDateListView`・`SearchAndFilterPanel`・`SessionList` の CSS Modules を再設計し、xl=2カラム、md-lg=スタック、xs=単一カラムのテンプレートを適用する
  - `SessionDetail` や `Navigation/AppShell` も新しいレイアウトトークンと余白スケールへ合わせ、横スクロール/折り返し問題を解消する
  - _Requirements: 2_

- [x] 3.1 レスポンシブ余白・コンテナユーティリティを共通化する
  - `frontend/src/styles/layout/spacing.css` で `--space-xs〜xl` トークンとコンテナユーティリティクラスを提供し、Session/Status/Pagination で共有する
  - Storybook/Docs に各ブレークポイントでの例を掲載し、開発者が参照できるレイアウトガイドを `docs/styleguide.md` に記述する
  - _Requirements: 2,4_

- [ ] 4. Storybook とスタイルガイドを構築する
  - `frontend/.storybook/` を作成し、`ThemeProvider` デコレーター・Viewport/Controls/Docs アドオンを設定、`npm run storybook` / `build-storybook` スクリプトを package.json に追加する
  - `SessionsDateListView`, `SessionCard`, `AppShell`, `StatusBanner` などのストーリーを追加し、Controls から `theme` と `breakpoint` を操作可能にする
  - `docs/styleguide.md` に Storybook の閲覧手順、静的ビルド Artifact の参照方法、トークン/レイアウトルールを整理する
  - _Requirements: 4_

- [ ] 5. TDD によるテーマ/レスポンシブテストとビジュアル検証を整備する
  - `frontend/src/features/ui-theme/__tests__/ThemeProvider.test.tsx` と `features/layout/__tests__/useResponsiveLayout.test.ts` を Red→Green→Refactor で追加し、`renderWithTheme`・`matchMediaMock` ヘルパーを整備する
  - Storybook Test Runner or Playwright のスクリプト (`npm run test:storybook`, `npm run test:visual`) を作成し、xs/md/xl の DOM or 画像スナップショットを CI へ組み込む
  - README「テスト実行」節に新スクリプト/手順を追記し、検出不具合をテストコメントへ残すフローを明記する
  - _Requirements: 5_

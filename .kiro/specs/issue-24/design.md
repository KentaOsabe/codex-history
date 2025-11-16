# Design Document

## Overview
Codex History の issue-24 は、既存の Sessions Date List View を中心としたフロントエンドへ Bootstrap 互換のデザイントークンとレスポンシブレイアウトを導入し、画面幅やテーマ設定に依存しない一貫した体験を提供することを目的とする。検索・フィルタ UX（issue-23）で追加された複数コンポーネントは CSS モジュール上でリテラルカラーを持っており、Breakpoints も `flex` ベースの最小限な実装に留まっている。本仕様ではテーマトークンと ThemeProvider を中核に据え、Storybook/Playwright によるマルチビューポート検証を TDD の枠組みで整備する。

本設計は 1) トークン定義と消費ロジック、2) レスポンシブグリッドの抽象化、3) テーマ切り替え決定とドキュメント/テスト資産の更新、の 3 レイヤーで構成し、それぞれを疎結合に保つ。既存の API 層やバックエンドには変更を発生させない。

### Goals
- Bootstrap カラースケールおよびタイポグラフィを CSS カスタムプロパティと React コンテキストに集約し、全 UI での色/余白/フォント利用を統一する。
- SessionsDateListView・SessionDetail など主要画面のレイアウトを 5 ブレークポイント (xs〜xl) に最適化し、ページャ・ステータス表示を含む各要素のレイアウト崩れを防止する。
- ライト/ダークテーマの可否を明文化し、実装する場合は ThemeToggle・Context・ドキュメント・Storybook を通じて TDD で回帰検知できる状態を作る。

### Non-Goals
- Rails バックエンドや API レスポンスの変更、もしくは検索 API の追加要件。
- 既存のセッション詳細ルーティングやデータ層の再構築。
- i18n 対応拡張や完全なデザインシステムドキュメントサイト（Storybook + README の範囲に限定する）。

## Architecture

### Existing Architecture Analysis
- 現行の `frontend/src/features/sessions-date-list/*.module.css` は固定色 (`#e2e8f0`, `#fff`, `#475569`) を直接利用し、テーマ切り替えやアクセシビリティを阻害している。
- レイアウトは単一カラム前提 (flex-col) で記述されており、幅 768px 未満では検索パネルやカードが横スクロールを生じるケースがある。
- 共通テーマは存在せず、`App.tsx` 直下で CSS Modules を読み込むのみ。ユーザー設定や `prefers-color-scheme` を参照する仕組みがない。
- Storybook は未導入。UI の検証は Vitest + Testing Library で DOM 単位に留まっており、レスポンシブやビジュアル差分を担保できていない。

### Architecture Pattern & Boundary Map
選択パターン: **Design Token + Theme Provider + Responsive Grid**。トークン管理 (Styles 層)、状態管理 (ThemeProvider / Layout hooks)、表示 (Feature UI) をレイヤリングすることで、将来のブランド変更や別デバイス拡張にも対応できるようにする。

```
flowchart LR
  Tokens[CSS Tokens + typography scale] --> ThemeProvider
  ThemeProvider --> UIComponents[SessionsDateListView / SessionDetail / Shared UI]
  ThemeProvider --> ThemeToggle
  LayoutConfig[Breakpoint map + layout hooks] --> UIComponents
  Storybook --> UIComponents
  Storybook --> VisualTests[Storybook Test Runner / Playwright]
```

- スタイル境界: `frontend/src/styles/theme/` 配下で `tokens.css`, `dark.css`, `typography.css` を定義し、Vite エントリで読み込む。
- 状態境界: `ThemeProvider` が `ThemeContext` を expose。`ThemeToggle` や Storybook Decorator はこの Context を利用する。
- レイアウト境界: `useResponsiveLayout` フックと `ResponsiveGrid` コンポーネントがブレークポイントに応じたパネル配置を司る。

### Technology Stack
| Layer | Choice / Version | Role in Feature | Notes |
|-------|------------------|-----------------|-------|
| Frontend / CLI | React 19 + Vite + CSS Modules | テーマトークン適用とレイアウト制御 | 既存構成を踏襲しつつ ThemeProvider を追加 |
| Theming | CSS Custom Properties + Bootstrap 5.3 スケール参照 | 色・タイポグラフィトークン管理 | SASS 不使用でポータブルに保つ |
| State | React Context + `useLocalStorage` フック | テーマ選択と `prefers-color-scheme` の同期 | SSR を考慮し初期値は `matchMedia` で遅延評価 |
| Testing | Vitest + Testing Library + Storybook Test Runner + Playwright | TDD（DOM + ビジュアル + スナップショット） | `@storybook/test-runner` でブレークポイントごとに DOM assert |
| Docs | Storybook (v8) + `docs/styleguide.md` | トークン/レイアウト/検証手順の共有 | `npm run storybook` / `npm run build-storybook` |

## System Flows

### Theme Toggle & Persistence
```
sequenceDiagram
  participant U as User
  participant Toggle as ThemeToggle
  participant Ctx as ThemeContext
  participant DOM as document.body
  participant LS as localStorage

  U->>Toggle: click (light/dark/system)
  Toggle->>Ctx: setTheme(nextMode)
  Ctx->>DOM: update data-theme attribute
  Ctx->>LS: persist { mode, resolvedTheme }
  opt system mode
    Ctx->>window.matchMedia: subscribe prefers-color-scheme
    window.matchMedia-->>Ctx: change event
    Ctx->>DOM: update attribute
  end
```
- `setTheme` は 50ms 以内に DOM を更新し、`SearchAndFilterPanel` などの CSS Modules が `:root` トークン経由で自動反映される。

### Responsive Layout Rendering & Visual Tests
```
flowchart TD
  Viewport[Viewport matrix xs/sm/md/lg/xl] --> useResponsiveLayout
  useResponsiveLayout --> LayoutContext
  LayoutContext --> SessionsDateListView
  LayoutContext --> SessionDetail
  LayoutContext --> StorybookDecorator
  StorybookDecorator -->|viewport addon| StorybookStories
  StorybookStories --> ScreenshotTests[Playwright/Storybook Test Runner]
```
- `useResponsiveLayout` は `matchMedia` を監視し、`layout` と `columns` 情報を提供する。
- Storybook では viewport アドオンと shared decorator を利用して同一ロジックを再現し、CI のスクリーンショットや DOM snapshot と同期させる。

## Requirements Traceability
| Requirement | Summary | Components | Interfaces | Flows |
|-------------|---------|------------|------------|-------|
| 1 | Bootstrap互換トークンとタイポグラフィ | `theme/tokens.css`, `ThemeProvider`, `docs/theme-tokens.md` | ThemeContext, CSS vars | Theme Toggle flow |
| 2 | レスポンシブレイアウト | `ResponsiveGrid`, `useResponsiveLayout`, updated CSS Modules | LayoutContext API | Responsive Rendering flow |
| 3 | ライト/ダークテーマ判断と実装 | `ThemeProvider`, `ThemeToggle`, `decisions.md` | ThemeContext, localStorage contract | Theme Toggle flow |
| 4 | スタイルガイド + Storybook | Storybook config, `styleguide.md`, Controls/Docs/Viewport addons | Storybook decorator interface | Visual Tests flow |
| 5 | TDD + レスポンシブテスト | Vitest suites, Storybook Test Runner, Playwright scripts | Testing utilities (`renderWithTheme`, `matchMediaMock`) | Both flows |

## Components and Interfaces

### Component Summary
| Component | Domain/Layer | Intent | Req Coverage | Dependencies (P0/P1) | Contracts |
|-----------|--------------|--------|--------------|-----------------------|-----------|
| ThemeTokens (CSS) | Styles | 提供色/タイポグラフィトークン | 1,3 | Bootstrap palette (P0) | CSS vars |
| ThemeProvider / ThemeContext | State | テーマ状態・永続化制御 | 1,3,4,5 | `ThemeTokens` (P0), `localStorage` (P1) | Context API |
| ThemeToggle | UI | ユーザー操作／アクセシビリティトグル | 3,4 | ThemeContext (P0) | Component props |
| ResponsiveGrid + useResponsiveLayout | Layout | 2カラム/スタック制御と API | 2,5 | `window.matchMedia` (P0) | Hook return type |
| StorybookConfig + Docs | Docs | 各 UI のテーマ/ブレークポイント確認 | 4,5 | ThemeProvider (P0) | Storybook preview.ts |
| Testing Utilities | QA | matchMedia/Theme テストヘルパー | 5 | Vitest, Storybook Test Runner | Helper API |

### ThemeTokens (Styles)
| Field | Detail |
|-------|--------|
| Intent | Bootstrap カラースケールとセマンティックトークンを CSS 変数で表現し、ライト/ダーク両テーマの土台を作る |
| Requirements | 1,3 |

**Responsibilities & Constraints**
- `frontend/src/styles/theme/tokens.css` にライトテーマの `--color-primary-50..900` とセマンティック名 (`--theme-surface-default`, `--theme-text-muted`) を定義。
- `dark.css` ではライトトークンを参照しつつ暗配色にオーバーライドし、`body[data-theme='dark']` のスコープ内で有効化。
- `typography.css` で `--theme-font-body`, `--theme-font-heading`, `--theme-font-mono` を宣言し、サイズ/行間スケールを CSS カスタムプロパティとして提供。

**Dependencies**
- **Outbound**: すべての CSS Modules が `var(--theme-*)` を参照する。Stylelint でリテラルカラー使用を禁止するカスタムルールを導入。

**Contracts**
- State: CSS variables (`:root`, `[data-theme='dark']`)。

**Implementation Notes**
- Vite のエントリ (`src/main.tsx`) で `import '@/styles/theme/index.css'` を追加し、Tree-shaking を阻害しない。
- `docs/theme-tokens.md` にトークン一覧とカラーチャート (PNG) を貼付する。

### ThemeProvider & ThemeContext
| Field | Detail |
|-------|--------|
| Intent | テーマモード (light/dark/system) を管理し、`prefers-color-scheme` と localStorage を統合する |
| Requirements | 1,3,4,5 |

**Responsibilities & Constraints**
- `ThemeProvider` は `ThemeContext` を介して `theme`, `resolvedTheme`, `setTheme`, `isSystem` を expose。
- 初期化時に `matchMedia('(prefers-color-scheme: dark)')` を遅延評価し、SSR やテストで `window` が無い場合はライトテーマにフォールバック。
- `<body data-theme={resolvedTheme}>` を制御し、50ms 以内の更新を guarantee。

**Dependencies**
- **Inbound**: AppShell、Storybook Decorator。
- **Outbound**: `localStorage['codex:theme']`, CSS tokens。

**Contracts**
```typescript
export type ThemeMode = 'light' | 'dark' | 'system'
interface ThemeContextValue {
  mode: ThemeMode
  resolvedTheme: Exclude<ThemeMode, 'system'>
  setTheme: (mode: ThemeMode) => void
}
```

**Implementation Notes**
- `useEffect` で `matchMedia` 変更イベントを購読し、`system` 選択時のみ反映。
- Vitest では `matchMedia` モックと `renderWithTheme` ヘルパーを提供。

### ThemeToggle Component
- Props: `{ 'aria-label': string }` は必須。`data-testid="theme-toggle"` を付与し、`aria-pressed` で状態を通信。
- 非同期操作防止のため `requestAnimationFrame` 内で context 更新。
- Storybook Controls で操作しやすいよう `ThemeToggle.stories.tsx` を追加。

### ResponsiveGrid & useResponsiveLayout
| Field | Detail |
|-------|--------|
| Intent | SessionsDateListView/Detail/Navigation をブレークポイントごとのテンプレートでレンダリング |
| Requirements | 2,5 |

**Responsibilities & Constraints**
- `useResponsiveLayout` が `{ breakpoint: 'xs'|'sm'|'md'|'lg'|'xl', columns: number }` を返し、`ResponsiveGrid` が CSS グリッドテンプレート (`grid-template-columns`) を適用。
- ブレークポイントは Bootstrap と一致 (`xs<576`, `sm≥576`, `md≥768`, `lg≥992`, `xl≥1200`)。
- SessionsDateListView の `styles.module.css` を変換し、`@media` 内で tokenized spacing/背景を使用。

**Dependencies**
- **Inbound**: SessionsDateListView, SessionDetail。
- **Outbound**: matchMedia, `window`.  SSR 時には no-op。

**Contracts**
```typescript
interface LayoutState {
  breakpoint: Breakpoint
  columns: number
  isStackedPanels: boolean
}
```

**Implementation Notes**
- `useResponsiveLayout` を Storybook Decoratorでも使用し、Docs タブに現在の breakpoint を表示。
- Playwright で各 breakpoint へ `page.setViewportSize` を適用。

### StorybookConfig + Docs
- `frontend/.storybook/main.ts` / `preview.ts` を新規作成。`ThemeProvider` を全ストーリーへ適用し、`withThemeProvider` デコレーターを追加。
- Viewport アドオン (`@storybook/addon-viewport`) と Controls/Docs を有効化。
- `styleguide.md` で Storybook 起動手順、コントロール操作、スクリーンショットテスト実行コマンドを記載。

### Testing Utilities
- `renderWithTheme`：Vitest で ThemeProvider + responsive context を注入。
- `setupMatchMediaMock`：`window.matchMedia` を stub し、テストごとに `setViewport('md')` のようなヘルパーを提供。
- Storybook Test Runner: `scripts/test-storybook-responsive.ts` を追加し、`npm run test:storybook` で 3 つ以上の viewport を巡回。

## Data Models

### Domain Model (Theme/Responsive)
- `ThemeMode`: `'light' | 'dark' | 'system'`。
- `ThemePreference`: `{ mode: ThemeMode; resolved: 'light' | 'dark'; updatedAt: ISO8601 }` を localStorage に保存。
- `Breakpoint`: `'xs'|'sm'|'md'|'lg'|'xl'`。`ResponsiveLayoutState` は `columns`, `panelLayout` (stacked / split) を含む。

### Logical Data Model
| Entity | Fields | Notes |
|--------|--------|-------|
| ThemeToken | name, valueLight, valueDark, semanticUsage | `docs/theme-tokens.md` に記載 |
| TypographyScale | token, fontFamily, weight, size, lineHeight, letterSpacing | README へも抜粋 |
| BreakpointConfig | name, minWidth, columns, panelTemplate | `frontend/src/styles/layout/breakpoints.ts` |
| StorybookViewport | name, width, height | preview.ts で宣言 |

### Physical Data Model
- **localStorage**: key `codex:theme-preference`。値例: `{"mode":"dark","resolved":"dark","updatedAt":"2025-11-15T05:00:00.000Z"}`。
- **CSS**: `:root` と `[data-theme='dark']` 内にカスタムプロパティを定義し、`SessionsDateListView.module.css` 等で参照。
- **Docs Assets**: `docs/styleguide.md` と `docs/theme-tokens.md` に PNG/SVG を配置し、Storybook build (`frontend/storybook-static/`) へのリンクを保持。

## Risks & Mitigations
- **リテラルカラーの取り残し**: Stylelint ルール `color-named: never` + カスタム ESLint ルールで検知する。
- **matchMedia 非対応環境**: フォールバックで `window` undefined 時はライトテーマに固定し、テストで `setupMatchMediaMock` を必ず import。
- **Storybook ビルド時間増加**: CI では `--docs --quiet` を利用し、成果物は Artifact として保持。Playwright によるスクリーンショットは主要 3 ビューポートに限定。

## Validation Strategy
1. TDD: `frontend/src/features/ui-theme/__tests__/ThemeProvider.test.tsx` などで Red → ThemeProvider 実装 → Green。
2. Storybook Test Runner: `npm run test:storybook -- --url http://127.0.0.1:6006` を CI に追加し、テーマ/ブレークポイントの DOM スナップショットを比較。
3. Playwright: `scripts/visual-regression.mjs` で SessionsDateListView / SessionDetail を xs, md, xl で撮影し、差分をブロック。
4. Manual QA: README / styleguide に沿ってライト/ダーク両テーマで UI を確認し、`docs/theme_toggle.md` に意思決定結果を残す。

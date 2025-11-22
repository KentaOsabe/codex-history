# Codex History スタイルガイド

 Codex History の UI は Bootstrap 互換のトークンとレスポンシブテンプレートで統一しています。本ドキュメントでは主要ブレークポイント、`ResponsiveGrid` / 余白ユーティリティの使い方、そしてテスト／検証フローをまとめます。Storybook (`npm run storybook`) でもここで定義したトークンやレイアウトをそのまま参照できます。

## ブレークポイントマトリクス

| Breakpoint | min-width | SessionsDateListView | SessionDetail | 備考 |
| --- | --- | --- | --- | --- |
| `xs` | `< 576px` | すべて単一カラム。`ResponsiveGrid` は `data-columns="1"` でヒーローヘッダがスタック。 | `SessionSummaryRail` は `<details>` アコーディオンでデフォルト閉じ、`TimelineFilterBar` を `ConversationRegion` 上部に sticky 配置。Meta/Tool drawer はボトムシートとして全幅に広がります。 | 横スクロール禁止。ハンバーガーメニューの代わりに AppShell が縦並びで収まります。 |
| `sm` | `>= 576px` | フィルターパネル + コンテンツを縦積み。検索／セッション両方のページネーションは `width:100%`。 | アコーディオンは sm でも閉じたまま開始し、Variant Switch は `summary` 要素の上に折り返されます。drawer は依然 bottom sheet で、`data-breakpoint="sm"` を Playwright で検証します。 | テキスト幅が 600px を超えないようカード幅は CSS Grid で 1 列固定。 |
| `md` | `>= 768px` | `ResponsiveGrid` はまだスタック。セッションリストは 1 列。 | 会話タブと詳細タブは縦スタックし、`TimelineFilterBar` は sticky pill。`SessionSummaryRail` はタブ下に展開し、drawer はボトムシートから 80% ビューポート高でせり上がります。 | ページャが 100% 幅で中央寄せになるよう `.layout-pill` を併用。 |
| `lg` | `>= 992px` | レイアウトは 2 カラム化し、`ResponsiveGrid` の `data-columns="2"` を Storybook で保証します。 | `ConversationRegion` が左、`SessionSummaryRail` が右に固定され、drawer はサイドシートへ自動的に切り替わります。タイムラインの `max-height: 70vh` とスクロール独立を Visual Test で確認します。 | Storybook では viewport `lg` を用意しておく想定。 |
| `xl` | `>= 1200px` | `ResponsiveGrid` が 8:16 の 2 カラムへ分割。検索パネルは左固定、SessionCard グリッドは 2 列。 | SessionDetail でも `SessionSummaryRail` の幅が 8 グリッドに収まり、Hero/Stats/Variant Switch はここに集約。会話領域は 16 グリッドで常にファーストビューを確保します。 | `renderHook(useResponsiveLayout)` で `breakpoint: 'xl', columns: 2` を検証。 |

## セッション詳細レイアウト指針

- **ConversationRegion**: `data-testid="conversation-region"` をタイムライン landmark に付与し、`aria-live="polite"` のタブアナウンス (`data-testid="session-tab-announcement"`) でアクセシビリティを担保します。`TimelineFilterBar` は `layout.columns === 1` の時だけ内部に描画し、user/assistant フィルタと bundle pill を sticky にします。
- **SessionSummaryRail**: xs〜md では `<details>` を利用した折りたたみコンポーネント、lg 以上では `<aside aria-label="セッション概要">` として常設します。Hero、Stats、Variant Switch、Meta/Tool ピルをすべてここに寄せることで会話本文のファーストビューを保証します。
- **MetaEventDrawer / ToolBundlePanel**: `useResponsiveLayout` が 1 カラムの場合は `placement="bottom"` で bottom sheet、2 カラムなら `placement="side"` でサイドシートを描画します。Drawer ヘッダーには `data-testid="meta-event-drawer"` とサニタイズバナーを必ず表示し、`highlightedIds` で会話カードに `data-highlighted="true"` を付与してください。
- **Storybook シナリオ**: `Sessions/SessionDetailPage` 配下の `ConversationFirst*` ストーリーでは Breakpoint × Theme を明示的に指定し、Playwright (`tests/storybook/responsive.spec.ts`) から `globals=breakpoint:xl;theme:dark` のように参照できるようにします。drawer 操作とサニタイズバナーの可視性を `@storybook/testing-library` の play function で担保してください。
- **ビジュアルテスト**: `npm run test:storybook` / `npm run test:visual` を CI から実行すると、`session-detail-*.png` のスクリーンショットと `trace.zip` が生成されます。`PLAYWRIGHT_VISUAL=1` のときのみ `storybook-artifacts/` へ保存し、ローカル開発では任意で無効化できます。

## ResponsiveGrid の使い方

```tsx
import ResponsiveGrid from '@/features/layout/ResponsiveGrid'

<ResponsiveGrid data-testid="layout-grid" minSidebarWidth="320px">
  <aside>...</aside>
  <section>...</section>
</ResponsiveGrid>
```

- `data-breakpoint` / `data-columns` 属性で現在のステートを確認できます。Vitest では `setupViewportMatchMediaMock` を用い、`env.setViewportWidth(1300)` のように疑似的にブレークポイントを切り替えます。
- `splitRatio` (デフォルト `[8, 16]`) と `minSidebarWidth` を変更することで 3 カラム化にも対応可能です。レイアウト調整は CSS ではなく `ResponsiveGrid` に寄せるのが推奨です。

## 余白・コンテナユーティリティ

`frontend/src/styles/layout/spacing.css` では以下のトークンとクラスを定義しています。

| トークン | 値 | 主な用途 |
| --- | --- | --- |
| `--space-xs` | `0.5rem` | バッジ / ピル内部余白 |
| `--space-sm` | `0.75rem` | 要素間の細かいギャップ |
| `--space-md` | `1rem` | 一般的な縦方向余白 |
| `--space-lg` | `1.5rem` | セクション間の余白 |
| `--space-xl` | `2.25rem` | ページコンテナ / 大きなカードの余白 |

| クラス | 説明 | 使用例 |
| --- | --- | --- |
| `.layout-container` | `max-width: 1280px` + ページパディング。 | `AppLayout` の `<main>` で全ページに適用。 |
| `.layout-panel` + `layout-panel--padded` | 枠線・影・背景と一貫したパディング。 | `SearchAndFilterPanel`, `SearchResultsList`, `SessionDetail` のタブパネル。 |
| `.layout-pill` | ピル状の角丸と余白を付与。 | `StatusBanner`, `PaginationControls`。 |
| `.layout-full-width` | `width: 100%` を強制。 | ステータスバナーを横幅いっぱいに伸ばす場合。 |

> CSS Modules 側では余白やボーダーを極力定義せず、これらユーティリティを `className="layout-panel layout-panel--padded"` のように付与してください。`layout-pill` は `PaginationControls` / `StatusBanner` がデフォルトで追加しますが、サイズ変更が必要な場合は `className` 経由で上書きできます。

## Storybook とスタイルガイド

- `cd frontend && npm run storybook` で Storybook が起動し、ツールバー右側に `Theme` グローバルコントロール（system/light/dark）と Viewport アドオン（xs/sm/md/lg/xl）が表示されます。切り替えのたびに `<body data-theme>` と `data-breakpoint` が即時更新されることを Docs タブでも確認できます。
- 代表ストーリーは次の 4 つです。
  - `Sessions/SessionsDateListView` … `ResponsiveGrid` + `StatusBanner` を含むページ全体。Docs には使用トークンの一覧を記載しています。
  - `Sessions/SessionCard` … `layout-panel` とタイポグラフィトークンの適用例。Controls で `contextLabel` / `summary` を変更して余白と折り返しを検証できます。
  - `Navigation/AppShell` … `AppLayout` + `ThemeToggle` を表示し、ライト/ダーク + ブレークポイントでヘッダー余白が破綻しないかを確認します。
  - `Feedback/StatusBanner` … `layout-pill` ユーティリティと警告色トークンのコントラスト確認に使用します。
- Storybook のデータは `frontend/src/mocks/storybookHandlers.ts` の MSW ハンドラーで供給されています。`/api/sessions` と `/api/search` をモックしているため、追加シナリオを作る際はこのファイルにレスポンスを追記してください。
- 静的サイトは `cd frontend && npm run build-storybook` で `frontend/storybook-static/` に生成されます。CI ではこのディレクトリを Artifact として保存し、ブラウザで `index.html` を開くか `npx http-server storybook-static -p 6007` で共有できます。
- ビューポート切り替えは独自の `Breakpoint` ツールバー（xs/sm/md/lg/xl）に統合しました。選択すると `window.matchMedia` をモックした上でストーリーコンテナ幅も変更されるため、旧 `@storybook/addon-viewport` がなくても実寸シミュレーションが可能です。

## テストと検証フロー

1. **Vitest (DOM テスト)**
   - `npm run test -- useResponsiveLayout SessionsDateListView` で `useResponsiveLayout` のブレークポイント遷移と `ResponsiveGrid` の `data-columns` を検証します。
   - `setupViewportMatchMediaMock` を `@/test-utils/matchMediaMock` から import し、`env.cleanup()` まで呼び出すことを忘れないでください。
2. **スタイルリンティング**
   - 余白／色を直接ハードコードしていないかは `npm run lint:style` で検出できます。`layout/spacing.css` に無いサイズ値は原則導入しません。
3. **手動確認**
   - ブラウザ幅 520px / 900px / 1280px を順に確認し、`body[data-theme]` 切り替え時も `ResponsiveGrid` が 50ms 以内に再レイアウトすることを DevTools の `data-breakpoint` で確認します。
4. **Storybook**
  - `npm run storybook -- --ci` でヘッドレス起動し、Theme/Breakpoint を切り替えながら `Sessions/SessionsDateListView` と `AppShell` の Docs タブで `--theme-*` / `--space-*` トークンが揃っているかを確認します。
  - `npm run build-storybook` の成果物をブラウザで確認し、`Feedback/StatusBanner` がライト/ダーク共に 4.5:1 のコントラストを維持することを確認してください。
  - 自動化された Storybook Test Runner の代わりに、`npm run test:storybook` / `npm run test:visual` を利用して Playwright 上で DOM 検証とスクリーンショットを実行します。

## 開発者チェックリスト

- [ ] 新規セクションやカードを追加する際は `layout-panel` + `layout-panel--padded` を必ず付ける。
- [ ] インライン操作要素（ページャ、ステータスなど）は `layout-pill` で角丸・余白を統一する。
- [ ] レスポンシブ挙動を変える場合、`useResponsiveLayout` のブレークポイント定義を更新し、同じ値を CSS (`@media (min-width: ...)`) にも反映する。
- [ ] 新しいビューポート要件を追加したら本ドキュメントのマトリクスに追記する。

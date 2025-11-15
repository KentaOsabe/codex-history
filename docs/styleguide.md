# Codex History スタイルガイド

 Codex History の UI は Bootstrap 互換のトークンとレスポンシブテンプレートで統一しています。本ドキュメントでは主要ブレークポイント、`ResponsiveGrid` / 余白ユーティリティの使い方、そしてテスト／検証フローをまとめます。Storybook (`npm run storybook`) でもここで定義したトークンやレイアウトをそのまま参照できます。

## ブレークポイントマトリクス

| Breakpoint | min-width | SessionsDateListView | SessionDetail | 備考 |
| --- | --- | --- | --- | --- |
| `xs` | `< 576px` | すべて単一カラム。`ResponsiveGrid` は `data-columns="1"` でヒーローヘッダがスタック。 | タブ／アクションを縦積み、`infoBar` は 1 列化。 | 横スクロール禁止。ハンバーガーメニューの代わりに AppShell が縦並びで収まります。 |
| `sm` | `>= 576px` | フィルターパネル + コンテンツを縦積み。検索／セッション両方のページネーションは `width:100%`。 | `infoBar` が 2 列まで展開、タブボタンは折り返し可。 | テキスト幅が 600px を超えないようカード幅は CSS Grid で 1 列固定。 |
| `md` | `>= 768px` | `ResponsiveGrid` はまだスタック。セッションリストは 1 列。 | タイムラインと詳細パネルはタブ切替。 | ページャが 100% 幅で中央寄せになるよう `.layout-pill` を併用。 |
| `lg` | `>= 992px` | レイアウトは `md` と同一 (スタック) だが余白が広がる。 | Timeline の `max-height` を 70vh に固定。 | Storybook では viewport `lg` を用意しておく想定。 |
| `xl` | `>= 1200px` | `ResponsiveGrid` が 8:16 の 2 カラムへ分割。検索パネルは左固定、SessionCard グリッドは 2 列。 | タイムライン／詳細パネルとも `layout-panel` の左右余白を保ったまま並列表示。 | `renderHook(useResponsiveLayout)` で `breakpoint: 'xl', columns: 2` を検証。 |

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

## テストと検証フロー

1. **Vitest (DOM テスト)**
   - `npm run test -- useResponsiveLayout SessionsDateListView` で `useResponsiveLayout` のブレークポイント遷移と `ResponsiveGrid` の `data-columns` を検証します。
   - `setupViewportMatchMediaMock` を `@/test-utils/matchMediaMock` から import し、`env.cleanup()` まで呼び出すことを忘れないでください。
2. **スタイルリンティング**
   - 余白／色を直接ハードコードしていないかは `npm run lint:style` で検出できます。`layout/spacing.css` に無いサイズ値は原則導入しません。
3. **手動確認**
   - ブラウザ幅 520px / 900px / 1280px を順に確認し、`body[data-theme]` 切り替え時も `ResponsiveGrid` が 50ms 以内に再レイアウトすることを DevTools の `data-breakpoint` で確認します。
4. **Storybook**
  - `npm run storybook -- --ci` でヘッドレス起動し、Theme/Viewport を切り替えながら `Sessions/SessionsDateListView` と `AppShell` の Docs タブで `--theme-*` / `--space-*` トークンが揃っているかを確認します。
  - `npm run build-storybook` の成果物をブラウザで確認し、`Feedback/StatusBanner` がライト/ダーク共に 4.5:1 のコントラストを維持することを確認してください。

## 開発者チェックリスト

- [ ] 新規セクションやカードを追加する際は `layout-panel` + `layout-panel--padded` を必ず付ける。
- [ ] インライン操作要素（ページャ、ステータスなど）は `layout-pill` で角丸・余白を統一する。
- [ ] レスポンシブ挙動を変える場合、`useResponsiveLayout` のブレークポイント定義を更新し、同じ値を CSS (`@media (min-width: ...)`) にも反映する。
- [ ] 新しいビューポート要件を追加したら本ドキュメントのマトリクスに追記する。

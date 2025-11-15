# ライト/ダークテーマの意思決定

## 背景
- issue-24 では Bootstrap 互換トークンへ移行しつつ、暗所での可読性向上とアクセシビリティ確保が求められた。
- 既存 UI はライトテーマのみで、ユーザーの `prefers-color-scheme` や永続化された選好を参照できず、夜間の眩しさや配色差分のレビューが困難だった。

## 採用判断
- WCAG 2.1 AA (4.5:1) を満たしたトークンがライト/ダーク双方で揃ったため、両テーマを正式サポートする。
- システム設定を尊重しつつユーザー操作で即座に上書きできるガード (localStorage + `prefers-color-scheme` 同期) を持たせ、50ms 以内に `<body data-theme>` を切り替えられる実装を選定。
- UI には単一ボタン + `SYS` リセットを配置し、ヘッダー導線を最小限に抑えながらアクセシビリティ属性 (`aria-pressed`, `aria-label`) を付与した。

## 実装概要
- `frontend/src/features/ui-theme/ThemeProvider.tsx` が `ThemeMode ('light'|'dark'|'system')` と解決済みテーマを Context で配信し、`codex:theme-preference` に `{ mode, resolved, updatedAt }` を保存する。
- `prefers-color-scheme: dark` を `matchMedia` で購読し、`mode === 'system'` のときは OS 変更を即時反映。`document.body.dataset.theme` と `document.documentElement.style.color-scheme` をレイアウトエフェクトで更新する。
- `ThemeToggle` (`data-testid="theme-toggle"`) はライト/ダークをトグルし、`SYS` ボタンで `mode='system'` に戻す。いずれも `requestAnimationFrame` 内で Context 更新し、テストからは `aria-pressed` を読めば状態が把握できる。
- Vitest (`src/features/ui-theme/__tests__/ThemeProvider.test.tsx`) で localStorage 復元、トグル操作、`matchMedia` 変化の追従を Red→Green で保証した。

## 再検討条件
- 新しいブランドガイドラインでトークン構成が変わり、ライト/ダークで 4.5:1 を満たせなくなった場合。
- Storybook / Visual Regression でテーマ差分を検知できない期間が 2 リリース以上続いた場合。
- 端末設定不一致や `prefers-color-scheme` 未対応ブラウザで不具合報告が連続した場合は、`mode='system'` の初期化を停止しライト固定へ戻す案を検討する。

# Implementation Plan

- [x] 1. 検索APIクライアントと型定義を追加する
  - `frontend/src/api/search.ts` と `types/search.ts` を新設し、`GET /api/search` のリクエスト/レスポンス型・クエリビルダーを実装する
  - MSW ハンドラーと API レベルのユニットテストで 200/400/422/500/タイムアウトの応答を Red→Green→Refactor で検証する
  - _Requirements: R1, R4, R5, R6_

- [x] 1.1 HTTP クライアントとエラーマッピングを拡張する
  - `queryBuilders.ts` に検索パラメータ（keyword/page/limit/scope）を追加し、`mapApiErrorToFetchError` に検索特有のフィールドハイライト情報を渡せるよう調整する
  - 422 の invalid_parameters をフォームバリデーションで活用できるよう、invalid_fields を受け取るユーティリティを実装する
  - _Requirements: R1, R5, R6_

- [x] 2. 検索・日付フィルタ用のフック層を構築する
  - `useSessionsFilters` を作成し、キーワード・日付範囲・ページネーション状態とバリデーションを集約する
  - `useSearchResults` でキャッシュ/AbortController/ローディング状態/エラー情報を管理し、`useSessionsByDateRange` で一覧 API を範囲 + ページネーション対応に拡張する
  - 各フックの Vitest を TDD で追加し、競合リクエスト抑止やキャッシュヒットを検証する
  - _Requirements: R1, R2, R3, R4, R6_

- [x] 3. UI コンポーネントを検索・フィルタ対応に更新する
  - `SearchAndFilterPanel`, `DateRangePicker`, `PaginationControls`, `SearchResultsList`, `SearchResultCard` を実装／更新し、`SessionsDateListView` に統合する
  - ローディングスケルトン、ARIA 属性、ハイライトスニペット表示、ヒット数バッジを実装する
  - _Requirements: R1, R2, R3, R4_

- [x] 3.1 既存コンポーネントの状態表示とアクセシビリティを強化する
  - `SessionCard`, `StatusBanner`, `RetryButton`, `EmptyStateView` を検索・フィルタ状態に応じたメッセージや再試行ハンドラに対応させる
  - 0件時・エラー時のコピー/ヒントを要件通りに表示し、`aria-live` 領域を追加する
  - _Requirements: R3, R4, R5_

- [x] 4. 統合テストとドキュメント整備を行う
  - `SessionsDateListView.test.tsx` などで検索→結果表示→ページング→フィルタ解除の E2E ライクなフローを MSW モックで検証する
  - README もしくは features の AGENTS/ドキュメントに検索UXの使い方とテストコマンドを追記する
  - _Requirements: R1, R2, R3, R4, R5, R6_

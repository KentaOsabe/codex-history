# Implementation Plan

- [x] 1. 詳細タブ UI とアクセシビリティを実装する
  - `SessionDetailTabs` コンポーネントを新設し、会話/詳細タブと ARIA ロール・キーボード操作を実装する
  - `SessionDetailPage` にタブ状態を追加し、既存タイムラインと新規詳細パネルを切り替え表示する
  - タブ切替時のフォーカス移動・スクリーンリーダーアナウンスをテストで担保する
  - _Requirements: R1, R5_

- [x] 1.1 詳細パネルのレイアウトとスケルトンを用意する
  - Details パネル用の CSS Modules を作成し、ローディング/データ欠如時のプレースホルダーを表示する
  - タブ切替時に detail が undefined の場合はスケルトン表示へフォールバックする
  - _Requirements: R1, R5_

- [x] 2. ツール呼び出し集約フックとタイムラインを実装する
  - `useDetailInsights` フックを作成し、`sessionDetail.messages` から `call_id` 単位で `toolInvocations` を抽出・memo 化する
  - `ToolInvocationTimeline` コンポーネントを作成し、引数/結果・ステータス・duration の表示と折りたたみトグルを実装する
  - call_id 未完了・不整合時の pending 表示を含むユニットテストを追加する
  - _Requirements: R2, R5_

- [x] 2.1 ツール呼び出しカードの JSON/HTML ビューアと警告表示を実装する
  - `SanitizedJsonViewer` を実装し、10KB 超の遅延展開・SafeList サニタイズ・警告バナー表示を行う
  - `ToolInvocationTimeline` へビューアを組み込み、引数/結果ごとに状態保持するフックを適用する
  - サニタイズで除去要素が発生したケースを Vitest で Red→Green→Refactor する
  - _Requirements: R2, R4, R5_

- [x] 3. メタイベント集約と表示コンポーネントを実装する
  - `useDetailInsights` に event_msg グルーピング処理を追加し、kind ごとの `metaEventGroups` を返す
  - `MetaEventsPanel` コンポーネントを実装し、token_count・agent_reasoning・environment_context・その他をアコーディオンで表示する
  - 未知 kind フォールバックや暗号化 reasoning プレースホルダーをテストする
  - _Requirements: R3, R5_

- [x] 3.1 Meta イベント用 JSON ビューアと統計まとめを追加する
  - token_count の入出力・合計を表形式で表示し、agent_reasoning 暗号化時はプレースホルダーを再利用する
  - event payload の JSON 表示に `SanitizedJsonViewer` を流用し、除去時警告を共有する
  - _Requirements: R3, R4_

- [x] 4. SafeList サニタイザと共通ユーティリティを実装する
  - `safeHtml.ts` を追加し、AllowList タグ/属性・href スキーム検証・危険属性除去を実装する
  - サニタイズ結果の `removed` フラグを返し、ビューア側で警告表示できるようにする
  - スクリプトタグ・onload 属性・javascript: スキームを含む入力に対するユニットテストを Red→Green→Refactor で作成する
  - _Requirements: R4, R5_

- [x] 5. 状態保持とテスト強化を行う
  - タブ状態・JSON 展開状態が sessionId/variant 変更後も要件通り復元されるよう `useRef` マップと `useEffect` を追加する
  - `SessionDetailPage.integration.test.tsx` に新タブのシナリオテストを追加し、call_id グルーピング・サニタイズ警告・variant 切替時の状態保持を検証する
  - TDD 手順と Requirements コメントを全テストケースへ追記し、`npm run test` に統合する
  - _Requirements: R1, R2, R3, R4, R5_

# Implementation Plan

- [x] 1. セッション詳細レイアウトを会話ファーストへ再配置する
  - `SessionDetailPage.tsx` を分割し、`SessionSummaryRail`（Hero/Stats/Variant Switch を格納）と `ConversationRegion`（メッセージタイムラインと landmark）を実装する。
  - xs–md では summary を `<details>` ベースのアコーディオンでデフォルト折りたたみ、lg+ では 2 カラム配置とする。`useResponsiveLayout` への breakpoints 追加と CSS Modules 更新を忘れずに。
  - タブ状態・スクリーンリーダー告知を維持したまま、初回表示でタイムライン先頭がファーストビューに入ることを Storybook + Playwright スナップショットで確認する。
  - _Requirements: 1.1, 1.3, 1.4_

- [x] 2. `useConversationEvents` と `ConversationEventLinker` を実装し、タイムライン表示モードを拡張する
  - `detail.messages` から user/assistant メッセージと meta/tool/system を分類し、`ConversationEvent` モデル（`relatedIds`, `isSanitizedVariant`, `sensitiveFields` 含む）を生成するフックを追加する。
  - `TimelineFilterBar` を作成し、`mode=conversation/full` 切り替え・meta/tool サマリーピル・drawer トリガーを提供。xs–md では sticky, lg+ では summary rail に統合する。
  - `useConversationEvents.test.ts` で role フィルタ、bundle 集計、関連メッセージハイライト、サニタイズ時の伏字置換を Red→Green→Refactor で網羅する。
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 3. Meta/Tool drawer 体験とサニタイズガードレールを実装する
  - `MetaEventDrawer` / `ToolBundlePanel` を追加し、`MetaEventsPanel` と `ToolInvocationTimeline` を再利用して bundle 詳細を表示する。drawer ヘッダーに「サニタイズ版」バナーを表示し、`SanitizedJsonViewer` の redacted モードで伏字を強制する。
  - Drawer オープン時に該当メッセージを `highlightedIds` で強調し、閉じたら解除する。VP 切替（side sheet / bottom sheet）もレスポンシブで検証する。
  - `MetaEventDrawer.sanitized.test.tsx` と Storybook Interaction Test を追加し、伏字・ハイライト・ARIA 属性を確認する。
  - _Requirements: 2.2, 2.3, 2.4_

- [ ] 4. TimelineLoadController と `useSessionDetailViewModel` のローディング制御を実装する
  - `TimelineLoadController` フックを作成し、`totalMessages` vs `detail.messages.length` を比較して `canLoadPrev/Next` を算出、不要な `refetch()` を抑止する。方向ごとに 1.2 秒のクールダウンを設ける。
  - `useSessionDetailViewModel` に `status: 'refetching'` 状態を導入し、再フェッチ中も既存 detail を保持する。`MessageTimeline` へ `canLoadPrev/Next` と `onRequestLoad` を渡し、`shouldVirtualize` false 時は端検知をショートサーキットする。
  - `TimelineLoadController.test.ts` と `SessionDetailPage.integration.test.tsx` を拡張し、スクリーンが空になる回帰を防止する。
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 5. ドキュメントと E2E/UX テストを更新する
  - README の「セッション詳細」セクションに会話ファースト UI と drawer 操作の説明、`npm run test:storybook` / `npm run test:visual` の手順を追記する。必要に応じて `docs/styleguide.md` にレイアウト指針を追加。
  - Storybook へ `SessionDetail` シナリオを追加し、xs/md/xl × ライト/ダークで動作確認する。Playwright / Storybook テストを CI に組み込む（既存スクリプト参照）。
  - _Requirements: 1.2, 3.4, 5.1-5.3_

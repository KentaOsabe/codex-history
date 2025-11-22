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

- [x] 3. Meta/Tool drawer 体験とサニタイズガードレールを実装する
  - `MetaEventDrawer` / `ToolBundlePanel` を追加し、`MetaEventsPanel` と `ToolInvocationTimeline` を再利用して bundle 詳細を表示する。drawer ヘッダーに「サニタイズ版」バナーを表示し、`SanitizedJsonViewer` の redacted モードで伏字を強制する。
  - Drawer オープン時に該当メッセージを `highlightedIds` で強調し、閉じたら解除する。VP 切替（side sheet / bottom sheet）もレスポンシブで検証する。
  - `MetaEventDrawer.sanitized.test.tsx` と Storybook Interaction Test を追加し、伏字・ハイライト・ARIA 属性を確認する。
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 4. TimelineLoadController と `useSessionDetailViewModel` のローディング制御を実装する
  - `TimelineLoadController` フックを作成し、`totalMessages` vs `detail.messages.length` を比較して `canLoadPrev/Next` を算出、不要な `refetch()` を抑止する。方向ごとに 1.2 秒のクールダウンを設ける。
  - `useSessionDetailViewModel` に `status: 'refetching'` 状態を導入し、再フェッチ中も既存 detail を保持する。`MessageTimeline` へ `canLoadPrev/Next` と `onRequestLoad` を渡し、`shouldVirtualize` false 時は端検知をショートサーキットする。
  - `TimelineLoadController.test.ts` と `SessionDetailPage.integration.test.tsx` を拡張し、スクリーンが空になる回帰を防止する。
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 5. ドキュメントと E2E/UX テストを更新する
  - README の「セッション詳細」セクションに会話ファースト UI と drawer 操作の説明、`npm run test:storybook` / `npm run test:visual` の手順を追記する。必要に応じて `docs/styleguide.md` にレイアウト指針を追加。
  - Storybook へ `SessionDetail` シナリオを追加し、xs/md/xl × ライト/ダークで動作確認する。Playwright / Storybook テストを CI に組み込む（既存スクリプト参照）。
  - _Requirements: 1.2, 3.4, 5.1-5.3_

- [x] 6. IDE コンテキストブロックの表示制御を追加する
  - `mapResponseToViewModel` でユーザー入力メッセージの Markdown セクション（`# Context from my IDE setup`, `## Active file`, `## Open tabs`, `## My request for Codex` 等）をパースし、`SessionMessageViewModel.metadata.ideContext` に heading / content を格納する。
  - `MessageCard`（特に user role）に「IDE コンテキストを表示/隠す」トグルを追加し、デフォルトでは `My request for Codex` セクションのみ展開、その他セクションは折りたたむ。セクションごとにチェックボックス/アクセシブルな `<details>` を実装し、ユーザーが常時表示するセクションを選べるプリファレンスを localStorage に保存する。
  - `TimelineFilterBar` か `SessionSummaryRail` にコンテキスト表示設定を集約し、前回の選択を維持できるよう `useConversationEvents` に hook を追加。Vitest（`MessageCard.ideContext.test.tsx`）と Storybook Interaction（`SessionDetailPage`）で `My request for Codex` は常に可視化されること、その他セクションが折りたためることを検証する。
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 7. IDE コンテキスト抽出と表示トグルの不具合を是正する
  - ユーザーメッセージ本文から `# Context from my IDE setup` ブロックを安全に切り離し、IDE セクション化後はタイムライン本文へ残さないよう `mapResponseToViewModel` / `useConversationEvents` を改修する。Markdown 範囲検出のテストを追加し、残余セグメントが空の場合は「本文なし」扱いにする。
  - `<details>` / `<summary>` の扱いを見直し、IDE コンテキストの表示・非表示、各セクションの「常に表示」チェックボックス、TimelineFilterBar のプリファレンス設定が互いに干渉せず作動するよう UI 状態管理を再設計する。ブラウザ再訪問時に persisted preference が反映されるか Vitest+Storybook で検証する。
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 8. 会話閲覧のノイズをさらに削減するシンプルビューを追加する
  - タイムライン初期表示を「会話のみ + フィルタ UI 非表示」に変更し、`TimelineFilterBar` を「詳細表示に切り替え」ボタンへ縮約する。詳細モードに入ったときのみメタ/ツールのサマリーピルと非表示件数を出す。
  - `MessageCard` のヘッダーから Source/Channel バッジを会話モードでは隠し、IDE コンテキストはデフォルト非表示（小さなチップから展開）とする。展開後は `defaultExpanded` 設定を尊重する。
  - `SessionSummaryRail` の InfoBar（データソース/最終更新）は `<details>` で折りたたみ、会話ファーストのビューを維持する。xs–md でのファーストビューがタイムライン先頭に入ることを Storybook + Playwright で確認する。
  - TDD: `SessionDetailPage.integration.test.tsx`, `MessageTimeline.test.tsx`, `MessageCard.ideContext.test.tsx`, `SessionDetailPage.stories.tsx` の追加/更新でモード切替・バッジ非表示・IDEコンテキスト初期非表示を Red→Green→Refactor で担保する。

- [x] 9. 初回ユーザー入力に混入する AGENTS.md をノイズとして除外する
  - `mapResponseToViewModel` / `extractIdeContextFromSegments` で AGENTS.md セクションを検出し、IDE コンテキストへ格納せず本文からも除去する。
  - `useConversationEvents` のセクション定義も同フィルタを適用し、タイムラインには表示しないことを保証する。
  - TDD: `mapResponseToViewModel.test.tsx` に AGENTS.md 混入ケースを追加し、`MessageCard.ideContext.test.tsx` で表示されないことを検証する。

- [x] 10. ユーザー入力の「本文はありません」常時表示と `<environment_context>` ノイズを排除する
  - ユーザーメッセージ本文が空でも IDE コンテキスト（特に My request for Codex）が存在する場合はタイムラインに「本文はありません」を出さない。必要に応じて「本文なし」扱いの条件を IDE コンテキスト有無で分岐する。
  - ユーザー入力に含まれる `<environment_context>...</environment_context>` ブロックを `mapResponseToViewModel` サニタイズで除去し、IDE/メタ領域にも載せない。
  - 表示抑制後もアンカーや関連付けが崩れないよう `useConversationEvents` / `ConversationEventLinker` の依存を確認・調整する。
  - TDD: `mapResponseToViewModel.test.tsx` に environment_context 混入ケースと「本文はありません」が出ないケースを追加し、`MessageCard.ideContext.test.tsx` で本文なしプレースホルダー抑制を検証、`SessionDetailPage.integration.test.tsx` で UI ノイズが出ないことを Red→Green→Refactor で担保する。
  - ✅ 初回表示で IDE コンテキスト以外に本文を持たない user メッセージを conversation 表示から除外し、ダブル「本文はありません」を解消した。

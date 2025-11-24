# Gap Analysis (issue-37: 詳細画面の表示修正)

## 1. 現状調査
- レイアウト: `SessionDetailPage.tsx` が `ResponsiveGrid` をデフォルト `splitRatio=[8,16]` で使用し、子順は左: `ConversationRegion`、右: `SessionSummaryRail`。比率 8:16 で右カラムが大きい。
- タイムライン表示: `MessageCard.tsx` がユーザーメッセージの IDE コンテキスト表示/トグル (`renderIdeContext`) を実装。`ideContextPreference` に基づき常時表示チェックボックスと `<details>` を備える。本文セグメントが空で ideContext が無い場合は「本文はありません。」を表示。
- コンテンツ構造: `mapResponseToViewModel.ts` で `metadata.ideContext.sections` を組み立て、`AGENTS_HEADING_KEY` などをフィルタ。`useConversationEvents.ts` で会話/詳細モードのメッセージを生成。
- スタイル: `MessageCard.module.css` で role 別色・フォントサイズを定義。ユーザー/アシスタントでサイズ差があるか要確認（現状: ユーザーは通常ウェイト、アシスタントは同クラス? 未検証）。

## 2. 要件別ギャップ
| 要件 | 既存挙動 | ギャップ | 対応候補 |
|------|-----------|----------|----------|
| Req1-1: "My request for Codex" を本文最上部 | IDE コンテキストの一部として折りたたみ表示。本文セグメントと別領域。 | コンテキスト扱いのままでは本文に出ない。 | `mapResponseToViewModel` で My request セクションを本文セグメントへ昇格、IDE コンテキストから除外。カード内の表示順制御。 |
| Req1-2: フォントサイズをアシスタント同等 | `MessageCard.module.css` で user/assistant のスタイル差異が不明（要確認）。 | サイズ差/余白差がある場合は統一が必要。 | CSS を揃える or 共通クラス適用。 |
| Req1-3: IDE コンテキスト/メニュー非表示 | `renderIdeContext` が常時レンダリング（セクション有無で分岐）。 | UI を外すか feature flag が必要。 | user ロール時に IDE コンテキスト全体を非表示、またはセクション配列を空にする。 |
| Req2-1/2/3: 本文 + 任意オプションのみ、初期OFF、空セクション無し | 現行オプション（checkbox + value）は存在。初期状態は `defaultExpanded` や preference に依存。 | 初期状態やセクション表示が IDE コンテキスト前提。本文/オプションの2段構造になっていない。 | ユーザーカード用データモデルを「本文 segments」と「options」の配列へ正規化し、オプションは unchecked で描画。空なら非表示。 |
| Req3-1/2: 左7割:右3割 (lg+) | `ResponsiveGrid` の splitRatio 8:16 で右が約2倍広い。 | 比率が逆。 | `SessionDetailPage` で splitRatio を [7,3] などに差し替え。最小幅も確認。 |
| Req3-3: モバイルはメッセージ 100% 先頭 | `ResponsiveGrid` は columns=1 で 1fr。ConversationRegion → SessionSummaryRail の順なので OK だが要確認。 | 既存で満たすが回帰テストが必要。 | レイアウトテスト/Story で確認。 |

## 3. オプション比較
- **Option A: 既存コンポーネント拡張**
  - `mapResponseToViewModel` で My request を本文セグメントへ再配置し、IDE コンテキストセクションを空にする。
  - `MessageCard` をユーザー時専用レイアウト分岐で「本文+オプション」構造に変更し、IDEコンテキスト UI を非表示に。
  - `ResponsiveGrid` 呼び出しを splitRatio=[7,3] に変更。
  - Pros: 影響範囲が既存ファイルに限定。Tests も既存スイート拡張で済む。
  - Cons: MessageCard の条件分岐が増え複雑化。

- **Option B: 新規ユーザーメッセージ用プレゼンテーションコンポーネント**
  - `UserMessageCard` を新設し、現行 `MessageCard` の user 分岐を排除。`MessageTimeline` 側でロール別にカードを選択。
  - Pros: 責務分離で可読性向上、IDE コンテキスト処理を切り離せる。
  - Cons: 新規ファイル・スタイルの増加、テストの重複が必要。

- **Option C: Hybrid**
  - `MessageCard` を薄い dispatcher にし、role ごとに小コンポーネントを切り出す（User/Assistant/Tool）。
  - Pros: 将来の拡張に対応、変更面を限定。
  - Cons: リファクタ規模が Option A より大きい。

## 4. Effort / Risk 評価
- Effort: **M (3–7日)** — UI 再構成とデータ整形、スタイル調整、既存テストの改修が必要。大規模ではないが複数コンポーネントにまたがる。
- Risk: **Medium** — 会話表示のコア変更で回帰リスクがある。IDE コンテキスト機能を無効化するため、既存ユーザ期待との不整合に注意。Story/Vitest による回帰テストが必須。

## 5. 推奨（設計フェーズへの入力）
- 採用方針: **Option A** をベースに、MessageCard 内でユーザー専用の単純レイアウト分岐を実装しつつ、splitRatio を 7:3 に変更。
- 重点テスト: ユーザーカードの本文表示順、フォントサイズ比較、オプション初期OFF、IDEコンテキスト非表示、デスクトップ比率確認（Storybook + Playwright / Vitest snapshot）。
- Research Needed: フォントサイズ差の有無（現CSS要確認）、オプションデータの現構造（`mapResponseToViewModel` / `types.ts`）。

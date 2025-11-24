# Requirements Document

## Project Description (Input)
Codex History のセッション詳細画面では、ユーザーメッセージと Codex 応答の流れを確認したいという当初の目的に反して、(1) メッセージタイムラインの直前にメタ情報や統計系 UI が並び、本編がファーストビューに入らない、(2) タイムラインをスクロールしていると一定量を超えた段階でコンポーネント全体が消えたりリセットされたりする、(3) タイムライン自体にメタイベント (`role: 'meta'`) やツール呼び出し (`sourceType: 'tool_call' | 'tool_result'`) がそのまま混在しており、「どんな INPUT があり、Codex がどう OUTPUT したか」の因果関係が読み解きづらい—というフィードバックが上がっている。フロントエンド実装を確認すると、`frontend/src/features/session-detail/SessionDetailPage.tsx` ではヒーローや InfoBar、タブ UI がタイムラインより上に積み上がっており、`MessageTimeline` には `mapResponseToViewModel` から渡された全メッセージ（ユーザー/アシスタント/ツール/メタ）がフィルタなしで描画されている。一方、`MessageTimeline` のスクロール端検知は `SessionDetailPage` の `onReachStart/onReachEnd` から常に `refetch()` を呼び出す実装になっており、API がページングを返さない現状では大規模セッションでスクロール中にステートが `loading` に戻りタイムライン DOM が一時的に消える危険性が高い。

## Requirements

### Requirement 1: 会話ファーストなレイアウトを提供する
**Objective:** セッション画面にアクセスしたユーザーが即座にメッセージタイムラインへ到達できるよう、冒頭のメタ情報群を整理し「会話ファースト」の優先順位を保証する。

#### Acceptance Criteria
1. WHEN `/sessions/:id` を開いたとき THEN ファーストビュー内に「メッセージタイムライン」の冒頭（直近のメッセージ) が入るように、ヒーロー/InfoBar/統計カードの高さを再編するか折りたたみ UI を導入する。
2. WHEN セッション詳細タブを切り替えても THEN 直近で開いたメッセージタブ状態が維持され、ブラウザ戻る/再訪問後も会話タブがデフォルトで最前面に表示される。
3. WHEN 画面幅が `xs–md` の場合 THEN 上記メタ情報群はアコーディオンやトグルで最小化した状態から開始し、タイムラインが横スクロールなしで 100% 幅に展開される。
4. WHEN 「会話」タブを初めて開いたとき THEN スクリーンリーダー向けに「会話タブを表示しています」と現在位置を案内し (既存 ARIA を流用)、メタ情報領域とは別の landmark を提供する。

### Requirement 2: メッセージタイムラインのノイズを制御し因果関係を読み解けるようにする
**Objective:** ユーザー/Codex の往復とその時点のツール実行・メタイベントを切り分け、必要に応じてオーバーレイやサイドパネルで参照できるようにして「INPUT→OUTPUT」が一目で追える状態を実現する。

#### Acceptance Criteria
1. WHEN タイムラインを表示するとき THEN デフォルトモードでは `role in {user, assistant}` のメッセージのみを表示し、メタ/ツール/システムメッセージは折りたたまれたサマリー（例: 「ツール呼び出し 2 件」バッジ）として挿入される。
2. WHEN ユーザーが「詳細を表示」操作を行ったとき THEN 対応するメタ/ツールイベントの内容 (Command/Arguments/Result, Token Stats など) がインライン展開またはサイドパネルに表示されるが、会話本文の連続性は維持される。
3. WHEN 任意のアシスタント応答カードを選択したとき THEN その応答を生成する前後で発生したユーザー入力・ツール呼び出し（`call_id`, `timestamp`）が強調され、時系列の依存関係がビジュアル的に追える。
4. WHEN サニタイズ済み variant が選ばれている場合でも THEN メタ/ツール情報の扱いは一貫し、サニタイズ対象フィールドは UI 上で伏字・ダミー値を表示して情報漏えいを避ける。

### Requirement 3: タイムラインスクロールで表示が消失しない堅牢なロード制御を整備する
**Objective:** 長尺セッションでもスクロール操作が DOM 消失やロードループを引き起こさないよう、`MessageTimeline` の仮想スクロールと `refetch` トリガーを見直す。

#### Acceptance Criteria
1. GIVEN 200 件以上のメッセージを持つセッション WHEN タイムラインを連続スクロールしたとき THEN `onReachStart/onReachEnd` は追加ページが存在する場合にのみ API を呼び出し、イベントログが存在しない場合は再フェッチを抑制する。
2. WHEN `refetch()` を実行する場合 THEN 既存メッセージ DOM は維持され、ローディング中にタイムラインが空白化・スクロール位置リセットされないことを Storybook interaction もしくは Vitest + JSDOM で検証する。
3. WHEN 仮想スクロールが無効な（120 件未満）セッションの場合 THEN `onReachStart/onReachEnd` はデフォルトで発火せず、スクロール端に到達しても API 呼び出しが行われない。
4. WHEN timeline コンテナより外側のページスクロールを行っても THEN inner timeline が適切にリサイズされ、`max-height: 70vh`（`SessionDetailPage.module.css`）や `height: 100%` の組み合わせによって高さが 0 になったり描画が消えることがないよう CSS/レイアウトテストを追加する。

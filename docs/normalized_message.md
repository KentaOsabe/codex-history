# NormalizedMessage スキーマ仕様

最終更新: 2025-10-11

## 背景

Codex CLI 0.44 以降の会話ログは `type` + `payload` を備えたイベントストリーム形式で保存され、2025-09 以前の一部ログはトップレベルに `id` / `instructions` を持つ旧フォーマット（本書では `legacy_session_entry` と呼称）として残っている。本仕様は両フォーマットを統合してバックエンドが扱う `NormalizedMessage` レコードへ変換するための定義を提供する。

## ソースイベント分類

| event.type | payload.type | 件数 (サンプル) | 正規化での扱い |
| --- | --- | ---: | --- |
| `response_item` | `message` | 128 | 会話本文。`payload.role` に応じて `role` を決定し、セグメントを生成。 |
| `response_item` | `reasoning` | 594 | 暗号化/難読化済み。`segments` には表示しないが `raw.encrypted_content` として保持。 |
| `response_item` | `function_call` | 520 | ツール呼び出し要求。`source_type: "tool_call"` として `tool_call` メタデータに変換。 |
| `response_item` | `function_call_output` | 520 | ツール呼び出し結果。`source_type: "tool_result"` として紐付け。 |
| `response_item` | `custom_tool_call` | 19 | `apply_patch` 等のカスタムツール呼び出し。`status` と `input` を保持し `tool_call` に整形。 |
| `response_item` | `custom_tool_call_output` | 19 | カスタムツール結果。`tool_result`。 |
| `session_meta` | — | 9 | セッション全体のメタデータ。`source_type: "session"` として1件のメタイベントにまとめる。 |
| `turn_context` | — | 599 | 実行時設定。セッションヘッダーに格納。 |
| `event_msg` | 各種 (`token_count`, `agent_reasoning` など) | 1,766 | 補足イベント。`source_type: "meta"`。 |
| `message` (旧) | — | 378 | 旧フォーマットの本文。後述のレガシー処理で `NormalizedMessage` 化。 |
| `reasoning` (旧) | — | 582 | 表示対象外の暗号化データ。`raw` のみ保持。 |
| `function_call` (旧) | — | 798 | 旧フォーマットのツール呼び出し。 |
| `function_call_output` (旧) | — | 798 | 旧フォーマットのツール結果。 |

> 件数は 2025-10-11 時点でのサンプルディレクトリ（`/Users/osabekenta/.codex/sessions`）を集計した値。

## NormalizedMessage エンティティ

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `id` | string | ✔︎ | `timestamp` と行番号を組み合わせた安定ID（例: `2025-10-11T10:19:50.935Z#23`）。 |
| `timestamp` | string (ISO-8601, UTC) | ✔︎ | 元イベントの `timestamp`。旧フォーマットでは行登場順から推定。 |
| `role` | enum (`user` / `assistant` / `tool` / `system` / `meta`) | ✔︎ | 表示用ロール。ツール呼び出しは `tool`、メタ情報は `meta`。 |
| `source_type` | enum (`message` / `tool_call` / `tool_result` / `meta` / `session` / `legacy`) | ✔︎ | 表示コンテキスト判別に利用。 |
| `segments` | `MessageSegment[]` | ✔︎ | 表示可能な内容。空配列の場合は UI 上で折りたたみ。 |
| `tool_call` | object | 任意 | `source_type` が `tool_call` / `tool_result` の場合に利用。`call_id`, `name`, `status`, `arguments`, `output` を含む。 |
| `raw` | object | ✔︎ | 元イベントを参照するメタ情報。`event_type`, `payload_type`, `file_path`, `line_index`, `encrypted_content`（必要時）など。 |
| `metadata` | object | 任意 | レンダリングに影響しない補足情報（例: `token_count`, `sandbox_policy`）。 |

### MessageSegment 構造

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `channel` | enum (`input` / `output` / `system`) | ✔︎ | Codex 側が示す `payload.content[].type` を `input_*` / `output_*` で二分類した値。 |
| `type` | enum (`text` / `image`) | ✔︎ | 表示用コンテンツ種別。将来拡張は `code`, `json` などを想定。 |
| `format` | string | ✔︎ | 元の `payload.content[].type` をそのまま保持（例: `input_text`, `output_text`, `input_image`）。 |
| `text` | string | 任意 | `type === "text"` の場合の本文。HTML サニタイズ済み。 |
| `media` | object | 任意 | `type === "image"` の場合に `data_uri`（ベース64を `data:` 形式で保持）、`size_bytes` などを格納。 |
| `annotations` | array | 任意 | ハイライトやツールリンクを付与する際に利用。初期実装では空。 |

## 正規化フロー

1. **イベント解析** – `type` / `payload.type` と旧フォーマット識別子からハンドラーを選択。
2. **ロール決定** – `payload.role` / `record_type` / `event.type` から `role` を決定。デフォルトは `meta`。
3. **セグメント構築** – `message` イベントの `content` を `MessageSegment` に変換。`input_text` → `channel: input, type: text`。
4. **ツール関連連結** – `function_call` と `function_call_output` は `call_id` で紐付け、`tool_call` オブジェクトへまとめる。
5. **暗号化データ処理** – `reasoning` 系は `segments` に出さず、`raw.encrypted_content` に文字列を保持。UI は「暗号化済み」と表示。
6. **メタイベント分類** – `event_msg` は `payload.kind`（例: `token_count`, `agent_reasoning`）を `metadata.event_kind` に格納し、必要に応じてダッシュボード等で利用。
7. **旧フォーマット移行** – `legacy_session_entry` では `record_type` が `message` の行を `NormalizedMessage` に変換し、タイムスタンプが無い場合はセッション冒頭の `timestamp` を再利用する。

## HTML サニタイズと暗号化 reasoning の扱い

- `segments[].text` を UI に出す前に `DOMPurify` 互換のホワイトリスト方式でサニタイズ（許可タグ: `p`, `pre`, `code`, `strong`, `em`, `ul`, `ol`, `li`, `a`）。
- `payload.type === "reasoning"` の `encrypted_content` は復号せず、保存時に SHA-256 ハッシュのみ表示用に保持すると安全。`raw.encrypted_content` には元文字列を格納し、API レスポンスでは非公開フラグを設ける。
- ツール入出力（`arguments`, `output`, `input`）は JSON 文字列で届くため、正規化時に `tool_call.arguments_json`, `tool_call.output_json` を別フィールドに格納し、UI では整形済み JSON として表示。

## 旧フォーマット互換レイヤー

- `legacy_session_entry` 行で `record_type === "message"` の場合、`role` / `text` を直接取得できる。
- その他の `record_type`（`function_call`, `function_call_output`, `reasoning` 等）は新フォーマットと同じ `source_type` へマップ可能。
- 旧フォーマットでは `timestamp` が存在しないケースがあるため、次の優先度で採番する:
  1. 行内に `timestamp` があれば利用。
  2. セッション最初の `timestamp` + 行番号増分 (1 秒刻み)。
  3. ファイル mtime を基準としたフォールバック。

## 付録: イベント→NormalizedMessage マッピング例

| 元イベント | NormalizedMessage | 備考 |
| --- | --- | --- |
| `response_item` (`message`, `role: user`) | `role: "user"`, `source_type: "message"`, `segments` = input テキスト | ユーザー入力は `channel: input` として扱う。 |
| `response_item` (`function_call`) | `role: "tool"`, `source_type: "tool_call"`, `tool_call.arguments_json` | `arguments` は JSON 文字列なので後段で `json.loads` 済みを保持。 |
| `event_msg` (`token_count`) | `role: "meta"`, `source_type: "meta"`, `metadata.token_count` | UI は集計タブで使用。 |
| 旧 `message` レコード | `role: 推定 (user/assistant)`, `source_type: "legacy"` | `record_type` が存在しない場合は発話順から推測。 |

この仕様に従って `NormalizedMessage` コレクションを生成することで、バックエンド API は統一フォーマットでフロントエンドへデータを提供でき、旧ログとの互換性も確保される。

# 検索API仕様

最終更新: 2025-10-13

本ドキュメントは Issue #7「全文検索APIとハイライト機能を提供する」で新設した `GET /api/search` エンドポイントの仕様をまとめる。セッション内メッセージの全文検索を提供し、レスポンスは既存APIと同様に `data` / `meta` / `errors` の3要素で構成する。

## エンドポイント
- **HTTP メソッド**: `GET`
- **パス**: `/api/search`
- **形式**: `application/json`

## クエリパラメータ

| パラメータ | 型 / 既定値 | 説明 |
| --- | --- | --- |
| `keyword` | 文字列, 必須 | 検索語句。前後の空白は削除し、空文字は 400 を返す。部分一致・大文字小文字無視。|
| `scope` | 文字列, 既定 `chat_messages` | 検索対象のスコープ。初期実装では `chat_messages` のみ対応し、他スコープ指定時は 400 (`invalid_parameters`)。|
| `page` | 整数, 既定 `1` | ページ番号 (1 始まり)。0 以下は 400。|
| `limit` | 整数, 既定 `10`, 範囲 `1..50` | 1 ページあたり件数。範囲外は 400。|

## レスポンス構造

`data[]` には検索ヒットごとのリソースを格納する。各要素は以下のキーを持つ。

| フィールド | 説明 |
| --- | --- |
| `id` | `session_id:message_id:occurrence_index` の形式で生成される一意ID。|
| `type` | `search_result` 固定。|
| `attributes.session_id` | ヒットしたメッセージが属するセッションID。|
| `attributes.scope` | 検索スコープ (`chat_messages`)。|
| `attributes.highlight` | 検索語を `<mark>` タグで囲んだスニペット。語の前後およそ10語を含み、文頭/文末が切り取られた場合は `…` を付与。|
| `attributes.occurred_at` | メッセージタイムスタンプ (`ISO8601`, UTC)。取得不能な場合はセッション作成日時。|
| `attributes.message_role` | 正規化メッセージのロール (`user`, `assistant` 等)。|
| `attributes.message_id` | `Sessions::NormalizedMessageBuilder` が割り当てたメッセージID。|
| `attributes.relative_path` | ハイライト対象の JSONL 相対パス。サニタイズ版が存在する場合は `*-sanitized.jsonl` を返す。|
| `attributes.occurrence_index` | 検索結果全体における 1 始まりの連番。|
| `links.session` | 対応する `GET /api/sessions/:id` のパス。|

`meta` にはページネーションとフィルタ情報を格納する。

| フィールド | 説明 |
| --- | --- |
| `pagination.page` | 要求ページ番号。|
| `pagination.limit` | ページサイズ。|
| `pagination.total_count` | 条件に一致した総件数。|
| `pagination.total_pages` | 全ページ数。ヒット0件の場合は0。|
| `filters.keyword` | 適用されたキーワード。|
| `filters.scope` | 適用されたスコープ。|
| `timing.duration_ms` | 検索処理に要した概算ミリ秒。|

## レスポンス例

```json
{
  "data": [
    {
      "id": "session-search-two:2025-03-02T09:00:06.000Z#3:1",
      "type": "search_result",
      "attributes": {
        "session_id": "session-search-two",
        "scope": "chat_messages",
        "highlight": "Remember to run <mark>rubocop</mark> --parallel before pushing.",
        "occurred_at": "2025-03-02T09:00:06Z",
        "message_role": "user",
        "message_id": "2025-03-02T09:00:06.000Z#3",
        "relative_path": "2025-03-02/session-search-two.jsonl",
        "occurrence_index": 1
      },
      "links": {
        "session": "/api/sessions/session-search-two"
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total_count": 4,
      "total_pages": 1
    },
    "filters": {
      "keyword": "rubocop",
      "scope": "chat_messages"
    },
    "timing": {
      "duration_ms": 3.1
    }
  },
  "errors": []
}
```

## エラーコード

| HTTP | code | 説明 |
| --- | --- | --- |
| 400 | `invalid_parameters` | `keyword` 未指定、`scope` 未対応、`page`・`limit` が範囲外など。`errors[].meta.invalid_fields` にフィールド別エラーを含む。|
| 404 | `session_not_found` | 既存実装から継承。検索処理では通常発生しないが、セッションファイルが削除された場合に備えてリポジトリ層で例外が上がれば 404。|
| 422 | `invalid_payload` | JSONL が破損している場合。|
| 500 | `missing_root` | `CODEX_SESSIONS_ROOT` が未設定・未存在。|

## 実装メモ

- サービス層で `Sessions::Repository` を利用してセッション一覧を取得。サニタイズ版が存在する場合は `*-sanitized.jsonl` を優先し、なければオリジナルを検索対象にする。
- メッセージ正規化には `Sessions::NormalizedMessageBuilder` を再利用するため、検索結果の `message_id` / `message_role` はセッション詳細と整合する。
- 検索語の照合には大文字小文字無視の正規表現を使用。ハイライトは一致した語を `<mark>` でラップし、前後 10 語を切り出す。
- 将来スコープ (`tool_calls` など) を追加する場合は `Search::KeywordSearcher#matches_scope?` に条件を追加し、同時に `Api::Searches::IndexParams::VALID_SCOPES` に許容値を増やす。

## テストフィクスチャ

- RSpec では `spec/fixtures/sessions/search/` 配下にテスト用の JSONL を配置し、`spec/support/search_fixture_helper.rb` でルート参照を提供している。
- `with_sessions_root(fixture: "search")` を利用することで `CODEX_SESSIONS_ROOT` を一時的に切り替え、検索テスト専用のデータセットを使用する。

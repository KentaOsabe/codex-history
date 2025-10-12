# セッションAPI仕様

最終更新: 2025-10-12

本ドキュメントは Issue #6「セッション一覧・詳細APIを実装する」で定義された Rails バックエンドAPIのエンドポイント仕様をまとめる。共通方針として、すべてのAPIレスポンスは `data` / `meta` / `errors` の3要素で構成する。

## 共通仕様

- **ベースURL**: `http://localhost:3000/api`
- **形式**: `Content-Type: application/json`
- **レスポンスエンベロープ**:
  - `data`: 成功時に返すリソース（配列またはオブジェクト）。
  - `meta`: ページネーションやキャッシュ更新時刻などの補足情報。
  - `errors`: エラー情報の配列。成功時は空配列。
- **エラー構造**: `errors[] = { code, status, title, detail, meta }`
- **タイムゾーン**: すべて UTC (`ISO8601` フォーマット, 例: `2025-01-01T00:00:00Z`).

## `GET /api/sessions`

セッション一覧をページネーション・ソート・フィルタ付きで取得する。

### クエリパラメータ

| パラメータ | 型 / 既定値 | 説明 |
| --- | --- | --- |
| `page` | 整数, 既定 `1` | ページ番号 (1 始まり)。0 以下は 400 を返却。|
| `per_page` | 整数, 既定 `25`, 範囲 `1..100` | 1 ページあたり件数。範囲外は 400。|
| `sort` | 文字列, 既定 `-created_at` | 並び順。`created_at`, `-created_at`, `message_count`, `-message_count`, `duration_seconds`, `-duration_seconds` を許可。先頭の `-` は降順。|
| `start_date` | 文字列 (`YYYY-MM-DD`) | 開始日 (inclusive)。`end_date` より大きい場合は 422。|
| `end_date` | 文字列 (`YYYY-MM-DD`) | 終了日 (inclusive)。|
| `speaker` | 文字列 | カンマ区切りのロール (`user,assistant,tool,system`)。未知のロールは 400。|
| `q` | 文字列, 任意 | 将来の全文検索用のプレースホルダ。現段階では 0 文字は禁止 (400)、存在する場合は大文字小文字無視の部分一致検索を実行する。|

### レスポンス例

```json
{
  "data": [
    {
      "id": "dummy-session-0001",
      "type": "session",
      "attributes": {
        "session_id": "dummy-session-0001",
        "title": "dummy-session-0001",
        "relative_path": "2025-01-01/session-0001.jsonl",
        "created_at": "2025-01-01T00:00:00Z",
        "completed_at": "2025-01-01T00:00:10Z",
        "duration_seconds": 10.0,
        "filesize_bytes": 1024,
        "message_count": 3,
        "tool_call_count": 1,
        "tool_result_count": 1,
        "reasoning_count": 1,
        "meta_event_count": 1,
        "has_sanitized_variant": true,
        "checksum_sha256": "...",
        "source_format": "jsonl_v2"
      },
      "links": {
        "self": "/api/sessions/dummy-session-0001"
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 25,
      "total_count": 42,
      "total_pages": 2
    },
    "sort": "-created_at",
    "filters": {
      "start_date": null,
      "end_date": null,
      "speaker": [],
      "q": null
    },
    "index": {
      "updated_at": "2025-10-12T03:12:00Z",
      "added_count": 1,
      "updated_count": 0,
      "removed_count": 0,
      "failed_entries_count": 0
    }
  },
  "errors": []
}
```

### 代表的なエラー

| HTTP | code | 詳細 |
| --- | --- | --- |
| 400 | `invalid_parameters` | `page`, `per_page`, `speaker`, `sort` のバリデーション失敗。`errors[].meta.invalid_fields` にフィールド単位のメッセージを格納。|
| 422 | `invalid_period` | `start_date` > `end_date` の場合。|
| 500 | `missing_root` | `CODEX_SESSIONS_ROOT` 未設定・未存在。|

### curl 例

```bash
curl "http://localhost:3000/api/sessions?per_page=20&sort=-message_count&speaker=user"
```

## `GET /api/sessions/:id`

単一セッションの詳細情報と正規化メッセージを取得する。

### パラメータ

| パラメータ | 説明 |
| --- | --- |
| `:id` | `Sessions::Repository` が生成した `session_id`。一覧レスポンスの `data[].id` を利用する。|
| `variant` | 任意。`original` (既定) または `sanitized`。サニタイズ版が存在しない場合は 422 を返す。|

### レスポンス例

```json
{
  "data": {
    "id": "dummy-session-0001",
    "type": "session",
    "attributes": {
      "session_id": "dummy-session-0001",
      "title": "dummy-session-0001",
      "relative_path": "2025-01-01/session-0001.jsonl",
      "filesize_bytes": 1024,
      "created_at": "2025-01-01T00:00:00Z",
      "completed_at": "2025-01-01T00:00:10Z",
      "duration_seconds": 10.0,
      "message_count": 3,
      "tool_call_count": 1,
      "tool_result_count": 1,
      "reasoning_count": 1,
      "meta_event_count": 1,
      "has_sanitized_variant": true,
      "source_format": "jsonl_v2",
      "messages": [
        {
          "id": "2025-01-01T00:00:05.000Z#2",
          "timestamp": "2025-01-01T00:00:05Z",
          "role": "user",
          "source_type": "message",
          "segments": [
            {
              "channel": "input",
              "type": "text",
              "format": "input_text",
              "text": "Show me the recent deployment summary."
            }
          ],
          "tool_call": null,
          "raw": {
            "event_type": "response_item",
            "payload_type": "message",
            "relative_path": "2025-01-01/session-0001.jsonl",
            "line_index": 2
          }
        }
      ]
    }
  },
  "meta": {
    "session": {
      "relative_path": "2025-01-01/session-0001.jsonl",
      "signature": "1704067200:1024",
      "raw_session_meta": {
        "timestamp": "2025-01-01T00:00:00.000Z",
        "payload": {
          "id": "dummy-session-0001",
          "originator": "codex_cli",
          "cli_version": "0.45.0-alpha"
        }
      }
    },
    "links": {
      "download": "/api/sessions/dummy-session-0001/download"
    }
  },
  "errors": []
}
```

### 代表的なエラー

| HTTP | code | 詳細 |
| --- | --- | --- |
| 404 | `session_not_found` | 指定した `:id` が存在しない。|
| 422 | `invalid_payload` | JSONL 正規化時に `Sessions::Errors::InvalidPayload` が発生。|
| 422 | `sanitized_variant_not_found` | `variant=sanitized` が指定されたが、該当セッションにサニタイズ版が存在しない。|
| 500 | `missing_root` | ディレクトリ未設定。|

### curl 例

```bash
curl "http://localhost:3000/api/sessions/dummy-session-0001"
curl "http://localhost:3000/api/sessions/dummy-session-0001?variant=sanitized"
```

## `CODEX_SESSIONS_ROOT` とキャッシュ前提

- Rails プロセスは `Sessions::Indexer#refresh` を定期的に呼び出し、結果をメモリ or `Rails.cache` に保持する。API レイヤーはキャッシュ結果とオンデマンド読み出しを組み合わせてレスポンスを構築する。
- 環境変数 `CODEX_SESSIONS_ROOT` が未設定の場合、API は 500 (`missing_root`) を返し、`errors[].detail` に解決方法を記す。
- Docker 開発環境では `docker-compose.yml` によりホストの `~/.codex/sessions` が `/data/codex` としてマウントされ、`CODEX_SESSIONS_ROOT=/data/codex` が既定となる。
- 一覧レスポンスに含める `meta.index.*` は直近の `Indexer#refresh` 結果を反映する。キャッシュが存在しない場合は `updated_at` を `null` とし、`added_count` などは 0 を返す。

## 今後の拡張余地

- `GET /api/sessions` への全文検索（`q`）対応強化、`GET /api/search` エンドポイントの追加。
- `POST /api/sessions/refresh` でバックグラウンドジョブを起動し、`jobs/:id` ポーリングをサポートする。
- 正規化済みメッセージのページネーション/ストリーミング応答（大規模セッション向け）。

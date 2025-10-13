# セッションインデックスとキャッシュ戦略

最終更新: 2025-10-12

## 目的

バックエンドが Codex 会話ログ（JSONL）を高速に提供できるよう、以下の責務をサービス層で分担する。

- `Sessions::StreamReader`: JSONL をストリーミング解析して統計値を算出
- `Sessions::Repository`: ディレクトリを走査してセッションメタデータを組み立て
- `Sessions::Indexer`: セッション一覧キャッシュを読み込み・差分更新

本ドキュメントでは、ファイル差分検出とキャッシュ更新フローを説明する。

## 環境変数とルートディレクトリ

- `CODEX_SESSIONS_ROOT`: ログ格納ディレクトリ。未指定時は `~/.codex/sessions` を使用。
- Docker 開発環境では `docker-compose.yml` でホスト上の `~/.codex/sessions` を `/data/codex` にマウントし、コンテナ内の `CODEX_SESSIONS_ROOT=/data/codex` として解決する。

RSpec では `spec/support/sessions_root_helper.rb` により、`spec/fixtures/sessions/**` を一時ディレクトリへコピーして環境変数を切り替える。

## ストリーミング解析 (`Sessions::StreamReader`)

1. `each_event(path)` でファイルを1行ずつ `JSON.parse`。`Enumerator` でメモリ効率を維持。
2. `summary_for(path)` は `SummaryBuilder` を用いて以下を集計:
   - `message_count` / `tool_call_count` などイベントタイプ別カウント
   - `session_id`（`session_meta` の `payload.id` 優先。無ければ `ディレクトリ名-ファイル名`）
   - `first_timestamp` / `last_timestamp`（ISO8601→UTC）
   - `raw_session_meta`（UI で追加情報が必要な場合に備えて保持）
3. 壊れた JSON 行は `Sessions::Errors::InvalidPayload`（行番号付与）を送出。

## メタデータ構築 (`Sessions::Repository`)

1. `resolve_root` が `CODEX_SESSIONS_ROOT` を解決し、存在・読み取り可否を検証。失敗時は `Sessions::Errors::MissingRoot`。
2. `scan` は `Dir.glob(**/*.jsonl)` で再帰走査し、`*-sanitized.jsonl` は無視。
3. 各ファイルに対して `stream_reader.summary_for` を呼び出し、以下のメタデータを生成:
   - `session_id`, `relative_path`, `absolute_path`
   - `created_at`, `completed_at`, `duration_seconds`
   - イベント種別ごとの件数 (`message_count` など)
   - `checksum_sha256`（`Digest::SHA256`）と `signature`（`mtime:size`）
   - `has_sanitized_variant`（同名 `-sanitized.jsonl` の存在確認）
4. `capture_errors: true` の場合、読み取り失敗は `failed_entries` に記録して処理継続。

## 差分検出・キャッシュ更新 (`Sessions::Indexer`)

1. キャッシュパスの既定値は `tmp/cache/sessions_index.json`。
2. `refresh` 処理:
   1. `repository.scan(capture_errors: true)` で最新エントリと失敗ログを取得。
   2. 直近キャッシュを `load_cache` で読み込み（JSON パース失敗時は空ハッシュにフォールバック）。
   3. `signature` を比較し、`added` / `updated` / `removed` を算出。
   4. `persist_cache` で `schema_version`, `generated_at`, `sessions[{relative_path => signature}]` をJSON形式で保存。
3. `refresh` の返り値は API 層が利用する構造体:

   ```ruby
   {
     sessions: [Hash],         # 最新メタデータ配列（相対パス昇順）
     added: [String],          # 新規検出された相対パス
     updated: [String],        # 内容変化があった相対パス
     removed: [String],        # 削除された相対パス
     failed_entries: [Hash],   # 読み取り失敗のログ
     updated_at: Time.utc      # インデックス作成時刻
   }
   ```

## 想定ユースケース

- API 起動時に `Indexer#refresh` を実行し、最新メタデータをメモリキャッシュに読み込む。
- `POST /api/sessions/refresh`（将来実装予定）で手動再インデックスをトリガーし、ジョブ完了後にキャッシュを再ロード。
- UI は `sessions` をページネーション付きで表示し、`updated`／`failed_entries` を通知に利用する。

## リフレッシュジョブとロック戦略

- `SessionsRefreshJob` は Active Job (`queue: default`) で実装され、`Sessions::CacheReader#refresh!` を呼び出す。
- `Sessions::RefreshLock` が `Rails.cache` を利用した軽量ロックを提供し、同時に複数の再インデックスが走らないよう制御する。
  - ロックキー: `sessions/refresh_lock`
  - TTL: 10 分（必要に応じて環境変数で上書き可, 今後拡張予定）
  - `mark_enqueued(job_id:, queue:, enqueued_at:)` でジョブ情報を記録し、監視 API (`GET /api/sessions/refresh/:job_id`) が参照する。
  - ジョブ完了時は `Sessions::RefreshLock.release_by_job(job_id)` が呼ばれ、ロックが解放される。以降のポーリングは 404 を受け取り、完了を検知する想定。
- ジョブの進行状況は下記 API で取得できる:
  - `POST /api/sessions/refresh` : ロック取得とジョブ投入、`job_id` の払い出し
  - `GET /api/sessions/refresh/:job_id` : ロックに記録されたステータス／キュー情報を返す

## 保守時の指針

- `schema_version` を変更する場合は、旧バージョンのキャッシュを破棄するかマイグレーション処理を追加する。
- 大容量ファイル対応が必要になった際は `StreamReader` の読み出しをさらに分割（例えば `Enumerator#lazy`）する。
- サニタイズ済みファイルを優先的に使用したい場合は、`Repository` でペアリングを行う拡張を検討する。

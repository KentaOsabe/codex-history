# Codex History – 開発環境セットアップ

## 前提
- Docker Desktop (v25 以降推奨)
- Docker Compose v2
- ローカルの Codex 会話ログディレクトリ（既定: `~/.codex/sessions`）

## 初回セットアップ
Rails アプリケーション本体は `backend/` 配下に配置されています。以下のコマンドはリポジトリルートで実行してください。

```bash
# 1) ルートに .env を作成（任意）
cp .env.example .env  # ログディレクトリを変更したい場合は編集

# 2) コンテナイメージをビルド
docker compose build backend

# 3) 依存 gem をインストール
docker compose run --rm backend bundle install


```

## フロントエンドセットアップ（Vite + React + TypeScript）
フロントエンド資材は `frontend/` 配下に配置されています。Node.js 20 以上を利用してください。

`.env`（またはシェル環境変数）に以下を指定するとバックエンド API やデフォルト絞り込み期間を変更できます。

※ `docker compose up backend frontend` の構成では `VITE_API_BASE_URL` を未設定にすると自動的に `http://backend:3000` へプロキシされます。Docker を使わずローカルで Rails(API) を起動する場合は `VITE_API_BASE_URL=http://localhost:3000` を指定してください。

```
# VITE_API_BASE_URL=https://api.example.com
VITE_DEFAULT_DATE_RANGE=7
```

```bash
cd frontend
npm install

# コード品質チェック
npm run lint
npm run test
npm run format
```

### npm スクリプト一覧
- `npm run dev`: Vite 開発サーバー（`http://localhost:5173`）
- `npm run build`: TypeScript ビルド + Vite 本番ビルド
- `npm run lint`: ESLint + Stylelint を連続実行
- `npm run test`: Vitest をワンショット実行
- `npm run test:watch`: Vitest をウォッチモードで起動
- `npm run format`: Prettier によるフォーマットチェック（`format:write` で自動整形）

## テスト実行
```bash
# プロジェクト全体の RSpec を実行（SimpleCov 有効）
docker compose run --rm backend bundle exec rspec

# カバレッジを無効化する場合
SIMPLECOV=false docker compose run --rm backend bundle exec rspec

# ローカル Ruby 環境で実行（Docker を利用しないケース）
bundle exec rspec

# RuboCop（Lint/Formatter）の実行
docker compose run --rm backend bundle exec rubocop

# Brakemanのセキュリティチェックの実行
docker compose run --rm backend bin/brakeman --no-pager
```

## 開発サーバー起動
```bash
docker compose up backend frontend
# http://localhost:3000 で Rails API、http://localhost:5173 でフロントエンドが起動します
```

終了するときは `Ctrl+C` で停止し、不要なコンテナは `docker compose down` で削除してください。

フロントエンドのみ起動したい場合は `docker compose up frontend` を利用できます。初回起動時はコンテナ内で `npm install` が自動実行され、`frontend-node-modules` ボリュームに依存パッケージがキャッシュされます。

## API 仕様
- セッション一覧・詳細・インデックス再構築 API は `docs/api_sessions.md` を参照してください。
- 全文検索 API (`GET /api/search`) の仕様とレスポンス例は `docs/search_api.md` にまとめています。
- すべてのエンドポイントは `data` / `meta` / `errors` の3要素でレスポンスを構成します。
- インデックス再構築ジョブの運用・監視手順は `docs/refresh_operations.md` を参照してください。

## サニタイズポリシーとエラー応答
- `variant=sanitized` で取得するメッセージテキストは、Loofah を利用した SafeList ベースのサニタイズを通過し、`pre` / `code` / 強調タグなど最小限の装飾のみを許可します（`javascript:` やインラインイベント属性は除去されます）。
- セッション検索ではサニタイズ済みファイルが存在する場合に自動的にサニタイズ版を参照します。
- 4xx 系エラーは `info` レベル、5xx 系エラーは `error` レベルでサーバーログに記録しつつ、レスポンスは `errors[0].status` に文字列化した HTTP ステータスコードを含む共通フォーマットで返却します。

## CI ワークフロー
- `.github/workflows/ci.yml` で GitHub Actions を設定し、以下のジョブを実行しています。
  - `scan_ruby`: Brakeman による静的解析。
  - `lint`: RuboCop を GitHub フォーマットで実行。
  - `test`: `docker compose run --rm backend bundle exec rspec` を利用した RSpec テスト。
- CI 実行時のカバレッジは `backend/coverage/` に出力され、リポジトリからは `.gitignore` で除外しています。

## バージョン
- Ruby: 3.4.3（コンテナ内）
- Rails: 8.0.3
- Node.js: 22 系最新（NodeSource リポジトリより取得）
- SQLite: 3.x（開発用）

## よく使うコマンド
```bash
# RSpec や各種 Rails コマンドを実行
docker compose run --rm backend bundle exec rails <command>

# Rails コンソール
docker compose run --rm backend bundle exec rails console

# RuboCop
docker compose run --rm backend bundle exec rubocop
```

## ディレクトリマウント
- プロジェクトルート (`.`) → `/app`
- `bundle-cache` ボリューム → `/bundle`（gem キャッシュ）
- `CODEX_SESSIONS_ROOT`（既定: `~/.codex/sessions`）→ `/data/codex`（読み取り専用）
  - サービス層では `Sessions::Repository#resolve_root` がバリデーションを行い、存在しない場合は `Sessions::Errors::MissingRoot` を発生させます。RSpec でテスト用ディレクトリを切り替える場合は `spec/support/sessions_root_helper.rb` を利用してください。

必要に応じて `.env` や `docker-compose.yml` でルートパスを変更してください。

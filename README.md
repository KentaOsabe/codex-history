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

## テスト実行
```bash
# サービス層のRSpecを実行
docker compose run --rm backend bundle exec rspec spec/services/sessions

# プロジェクト全体のRSpecを実行
docker compose run --rm backend bundle exec rspec

# RuboCop（Lint/Formatter）の実行
docker compose run --rm backend bundle exec rubocop
```

## 開発サーバー起動
```bash
docker compose up backend
# http://localhost:3000 で Rails API が起動します
```

終了するときは `Ctrl+C` で停止し、不要なコンテナは `docker compose down` で削除してください。

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

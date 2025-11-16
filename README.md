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

2025年11月実装の Sessions Date List View（カレンダー＋セッション一覧＋検索入力プレースホルダー）は同ディレクトリの `src/features/sessions-date-list/` にまとまっており、MSW + Vitest を用いた統合テストで初期表示、ゼロ件時の空状態、500 系エラー後のリトライ、カード選択時のナビゲーションを検証しています。

### Sessions Date List View の検索 / フィルタ UX
- 上部の検索パネルで 2 文字以上のキーワードを入力し「検索を実行」を押すと、前後の空白を除去したクエリで `GET /api/search` が呼ばれ、レスポンスのハイライト付きカードが一覧上部に挿入されます。
- 「検索結果」セクションではページャーでヒット結果を前後に移動でき、進行中はボタンが自動的に無効化されます。フィルタをリセットすると検索結果・ページ番号・入力欄が即座に初期化されます。
- 日付範囲の開始・終了を変更すると `GET /api/sessions?start_date=...&end_date=...` が再フェッチされ、`期間: YYYY-MM-DD〜YYYY-MM-DD` のコンテキスト表示と一覧ページャーが同期します。開始日 > 終了日 の場合はフォーム上にエラーが表示され API を抑止します。
- すべての条件を初期状態に戻したい場合は「フィルタをリセット」を押してください。初期期間（既定 7 日分）と1ページ目に戻り、検索結果セクションは非表示になります。

検索 UX の振る舞いは次の統合テストで網羅しているため、変更時は以下のコマンドで動作を検証してください。

```bash
cd frontend
npm run test -- src/features/sessions-date-list/__tests__/SessionsDateListView.test.tsx
```

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
- `npm run lint:fix`: ESLint / Stylelint を自動修正モードで実行
- `npm run storybook`: Storybook を `http://localhost:6006` で起動
- `npm run build-storybook`: Storybook を静的ビルド
- `npm run test:storybook`: Storybook を静的ビルドした上で Playwright で DOM アサーション（xs/md/xl の 3 幅）を実行
- `npm run test:visual`: `storybook-artifacts/` にスクリーンショットを保存しながら Playwright を実行（CI で差分比較用）
- `npm run test -- httpClient.test.ts errors.test.ts sessions.test.ts sessions.msw.test.ts`: API クライアント層のユニット / 統合テストのみを実行（MSW モック込み）

### UI テーマとトークン運用
- `frontend/src/styles/theme/` に CSS 変数を集約し、`main.tsx` で `tokens.css` / `typography.css` / `dark.css` をグローバル適用しています。React 側では `src/app/App.tsx` が `ThemeProvider` でアプリ全体をラップし、`prefers-color-scheme` + `localStorage (codex:theme-preference)` を基に `<body data-theme>` と `color-scheme` を 50ms 以内に切り替えます。
- ライト/ダーク双方のプレビューやフォントスケール、アクセシビリティ要件は `docs/theme-tokens.md` を参照してください。ライト/ダーク採否の記録、再検討条件、トグル仕様は `docs/theme_toggle.md` にまとめています。
- `AppLayout` の右上には `ThemeToggle` があり、クリックでライト/ダークをトグル、`SYS` ボタンでシステム既定（mode=system）へ戻せます。テストを書く際は `data-testid="theme-toggle"` と `aria-pressed` をアサートするとテーマ状態を把握できます。
- Stylelint を `color-no-hex` + カスタム禁止リストで拡張し、ESLint では `theme-guard/no-literal-colors` ルールで inline style のカラー直書きを検出しています。必ず `var(--theme-*)` を利用してください。

### レスポンシブ / ビジュアル検証
- Storybook では `Breakpoint` グローバルツールバー（xs〜xl）を用意し、選択した幅に合わせて `matchMedia` / `grid-template` をモックしています。旧 `@storybook/addon-viewport` 依存は撤廃し、より軽量なカスタム実装に置き換えました。
- `npm run test:storybook` は Storybook を静的ビルド → Playwright で `SessionsDateListView` / `SearchAndFilterPanel` / `SessionDetailPage` の `data-breakpoint` と列数を検証します。TDD の Red→Green チェックに利用してください。
- `npm run test:visual` は同じストーリーをスクリーンショット化し、`frontend/storybook-artifacts/*.png` に保存します。CI では失敗時にこのディレクトリをアーティファクト化すると視覚差分を簡単にレビューできます。

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

# フロントエンド API クライアント（MSW を含む）
cd frontend
npm run test -- httpClient.test.ts errors.test.ts sessions.test.ts sessions.msw.test.ts
```

### フロントエンド API クライアント層
- `frontend/src/api/httpClient.ts` がタイムアウト（GET 10 秒 / POST 15 秒）と指数的リトライ（既定で GET 1 回）を共通化します。
- `frontend/src/api/sessions.ts` がセッション一覧・詳細・リフレッシュ API を型安全に呼び出すファサードです。
- MSW ベースのテスト（`frontend/src/api/__tests__/sessions.msw.test.ts`）が 422/409 などの異常系を含むシナリオを再現します。追加のローカルサーバー起動は不要です。

### Docker 上でのフロントエンド Lint / Test 実行
ローカルの Node 版数に依存しないよう、Docker コンテナから lint / test を実行できます。

```bash
# ESLint / Stylelint（チェックのみ）
docker compose run --rm frontend npm run lint

# 自動修正付き lint
docker compose run --rm frontend npm run lint:fix

# API クライアント関連テスト
docker compose run --rm frontend npm run test -- httpClient.test.ts errors.test.ts sessions.test.ts sessions.msw.test.ts
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

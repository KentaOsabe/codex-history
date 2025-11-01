# 技術スタック

## アーキテクチャ

Rails 8 API がファイルシステムアクセス・正規化・キャッシュを担い、Vite 製 React SPA が JSON API を消費する二層モノレポ構成。Docker Compose が両サービスを結合し、バックエンドへ Codex セッションボリュームをマウントする。

## コア技術

- **言語**: Ruby 3.4.3（バックエンド）、TypeScript 5.9 + React 19（フロントエンド）
- **フレームワーク**: Rails 8（API モード）、Vite + React SPA
- **ランタイム**: フロントエンドツールチェーン向け Node.js 22、Docker 内 Puma（Rails）

## 主要ライブラリ

- **SolidCache / Rails.cache**: セッションインデックスとリフレッシュロック状態の永続化。
- **SolidQueue**: Active Job 経由でリフレッシュジョブをエンキュー。
- **Rails::Html::SafeListSanitizer + Loofah**: 信頼できないメッセージ本文のサニタイズ。
- **Vitest & Testing Library**: コンポーネントやフック単位のフロントエンドテスト。
- **RSpec + FactoryBot + SimpleCov**: バックエンドのユニット／結合テストとカバレッジ測定。

## 開発標準

### 型安全性
- TypeScript の strict モードと未使用シンボル検出（`noUnusedLocals`, `noUnusedParameters`）、`moduleResolution: "bundler"` の統一設定。
- バックエンド Ruby は Rails 流の型ヒントと、値オブジェクトではなくドメインサービスオブジェクトを活用。

### コード品質
- RuboCop Rails Omakase でスタイルを統制し、Brakeman を CI で常時実行。
- React / Hooks / import ルールを含む ESLint（flat config）と、CSS Modules 用 Stylelint + `stylelint-order`、整形は Prettier。
- SimpleCov でバックエンドカバレッジを可視化し、Vitest は `@testing-library/*` のアサーションと連携。

### テスト
- `docker compose run --rm backend bundle exec rspec` で SimpleCov 有効の Rails テストスイートを実行。
- Vitest は `src/api` のユーティリティや React コンポーネントの単体テストを提供し、`vitest --watch` が TDD を支援。

## 開発環境

### 必要ツール
- Docker Desktop v25+ と Docker Compose v2
- Node.js 22.x（ローカル開発）またはコンテナ化されたフロントエンドサービス
- GNU Make は任意。スクリプトは `package.json` と `docker compose` に集約。

### よく使うコマンド
```bash
docker compose run --rm backend bundle exec rspec
docker compose run --rm backend bundle exec rubocop
docker compose run --rm backend bin/brakeman --no-pager
cd frontend && npm run lint && npm run test && npm run build
```

## 主要な技術判断

- セッション走査はシグネチャ比較（`mtime:size`）で更新有無を検知し、変化のないファイル再処理を避ける。
- すべての API コントローラーは `Api::BaseController` を継承し、標準エンベロープとエラーログ集約を徹底。
- `Sessions::NormalizedMessageBuilder` が生の JSONL イベントを安定したスキーマへ変換し、サニタイズ要求時に安全化を適用。
- リフレッシュの並列制御は `Sessions::RefreshLock` が cache バックエンドのトークンで担い、インデックスジョブの二重起動を防ぐ。
- フロントエンドの API アクセスは単一の `fetcher` に集約し、ベース URL 正規化と JSON ヘッダー適用を共通化してフックを軽量化。

---
_すべての依存関係ではなく、標準とパターンを記録すること_

_更新日: 2025-11-01_

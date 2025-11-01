# プロジェクト構造

## 組織方針

Rails バックエンドと Vite/React フロントエンドを抱えたモノレポ構成。バックエンドはサービスオブジェクト（`Sessions::*`, `Search::*`, `Sanitizers::*`）へ責務を寄せ、コントローラーを薄く保つ。フロントエンドはアプリケーションシェルを `app/` に、共通設定を `config/` にまとめ、ドメインロジックは今後 `features/` 以下に展開する想定。

## ディレクトリパターン

### セッションサービス層
**配置**: `backend/app/services/sessions/`  
**目的**: ファイル走査・正規化・キャッシュ・リフレッシュ制御を集約。  
**例**: `Sessions::Repository` が JSONL を列挙し、`Sessions::DetailBuilder` が正規化メッセージを構築、`Sessions::RefreshLock` がジョブ状態をキャッシュへ保持。

### API インターフェース
**配置**: `backend/app/controllers/api/`  
**目的**: `render_success` / `render_error` を用いた統一 JSON エンドポイントを提供。  
**例**: `Api::SessionsController#index` がパラメータ検証・キャッシュ済みセッションのフィルタリング・エントリのシリアライズを担当し、ビジネスロジックはサービス層へ委譲。

### バックエンド仕様リポジトリ
**配置**: `docs/`  
**目的**: API 要件、正規化ルール、運用手順のリビングドキュメント。  
**例**: `docs/api_sessions.md` がサービス層で遵守すべきクエリ仕様を定義し、テストはこのドキュメントを基準に設計。

### フロントエンドアプリシェル
**配置**: `frontend/src/app/`, `frontend/src/config/`  
**目的**: トップレベルレイアウト、CSS Modules、環境変数を扱う設定を集約し、機能モジュールから再利用。  
**例**: `App.tsx` がヒーロー／プレースホルダー UI を提供し、`config/env.ts` が Vite 環境変数のパースを一元化。

### フロントエンドユーティリティ
**配置**: `frontend/src/api/`  
**目的**: API ベース URL 正規化とエラー標準化を行う共通 fetch ヘルパー。  
**例**: `api/client.ts` が JSON ヘッダー付与と絶対 URL 化を行い、型付きレスポンスを返却。

## 命名規約

- **Ruby ファイル**: クラス／モジュール名に対応するスネークケース（`sessions/repository.rb` → `Sessions::Repository`）。
- **TypeScript コンポーネント**: パスカルケース（`App.tsx`）と隣接する CSS Modules（`App.module.css`）。
- **テストファイル**: RSpec は `_spec.rb`、Vitest は `.test.ts(x)`。

## インポート整理

```typescript
import { fetcher } from '@/api/client'  // frontend/src への絶対パスエイリアス
import styles from './App.module.css'    // 局所モジュールは相対パス
```

**パスエイリアス**:
- `@/` → `frontend/src`

## コード組織の原則

- コントローラーはサービスオブジェクトへ委譲し、直接的なファイル I/O やキャッシュ操作を避ける。
- キャッシュ済みインデックス（`tmp/cache/sessions_index.json`）で走査結果の再現性を維持する。
- サニタイズは `Sanitizers::HtmlMessageSanitizer` に集約し、オリジナルとサニタイズ済み表示の整合性を確保。
- リフレッシュ処理はシングルフライトを原則とし、キャッシュベースのロックでジョブ重複を防ぐ。
- フロントエンドは `api/fetcher` などのユーティリティで共通処理を抽象化し、ドメイン固有 UI は `features/` に隔離する。

---
_パターンを記録し、ディレクトリ一覧は避ける。パターンに従う新規ファイルであれば更新不要_

_更新日: 2025-11-01_

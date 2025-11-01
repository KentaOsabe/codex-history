# Implementation Plan

- [ ] 1. HTTP クライアント基盤の整備
  - `httpClient.request` を新設し、タイムアウト・再試行・ベースURL解決を共通化する
  - `AbortController` によるタイムアウト制御とメソッド別既定値（GET 10 秒 / POST 15 秒）を導入する
  - エラー分類とカスタム例外クラス（`ApiClientError` など）の初期実装を行う
  - _Requirements: 機能要件「フェッチラッパー設計」「エラー処理」、非機能要件「TypeScript Strict」「TDD」_

- [ ] 1.1 エラークラスとユーティリティの追加
  - `frontend/src/api/errors.ts` に共通基底と派生クラスを定義する
  - エラーオブジェクトへ HTTP ステータス・meta・body スニペットを保持させる
  - `isRetryable` 等のユーティリティを用意し HTTP 層で利用する
  - _Requirements: エラー処理、テスト要件（異常系カバレッジ）_

- [ ] 2. セッション API ファサードの実装
  - `sessionsApi.list` / `show` / `requestRefresh` / `refreshStatus` の4メソッドを追加し、引数バリデーションとクエリ生成を実装する
  - TypeScript 型（一覧・詳細・ジョブレスポンス）を `frontend/src/api/types/sessions.ts` に定義する
  - JSON エンベロープに沿ってレスポンスを透過させつつ、呼び出し側が扱いやすい形に整形する
  - _Requirements: 機能要件「型定義とパラメータ」「レスポンス正規化」、ユースケース 1-3_

- [ ] 2.1 クエリビルダーとバリデーションヘルパーの実装
  - ページネーション・ソート・フィルタのクエリ文字列生成をユーティリティ関数として分離する
  - 非対応値を排除し、TypeScript のリテラル型と整合させる
  - 単体テストで境界値（per_page 範囲など）を確認する
  - _Requirements: 機能要件「型定義とパラメータ」、ユースケース 1_

- [ ] 3. テスト基盤とシナリオ作成
  - `msw` を導入し、`setupTests.ts` にサーバー初期化コードを追加する
  - `frontend/src/api/__tests__/sessions.test.ts` で正常系・異常系を TDD で作成する
  - タイムアウト・再試行・ネットワーク断・422/409/500 の各ケースを網羅する
  - _Requirements: テスト要件全般、非機能要件「TDD」「TypeScript Strict」_

- [ ] 3.1 再試行・タイムアウトのユニット検証
  - `httpClient` 単体でタイムアウト・再試行ロジックを MSW なしでテストする
  - Exponential backoff の間隔や最大回数が期待通りか検証する
  - リトライ不可エラーで再試行しないことを確認する
  - _Requirements: テスト要件（異常系）、非機能要件（TDD）_

- [ ] 4. ドキュメントと開発者向け案内の更新
  - `README.md` または `docs/` に API クライアント利用方法とテスト実行手順を追記する
  - 未決事項（タイムアウト既定値・429 取り扱い）の決定状況を Spec に反映する
  - _Requirements: 非機能要件（TDD 手順可視化）、未決事項 / 要確認_


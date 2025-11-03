# Implementation Plan

- [x] 1. セッション日付ビューの骨組みを実装する
  - `frontend/src/features/sessions-date-list/SessionsDateListView.tsx` を新規作成し、カレンダー・検索・一覧セクションのレイアウトとプレースホルダーを配置する
  - 既存の `App.tsx` から新コンポーネントをレンダリングし、既存プレースホルダー UI を退避する
  - 日付初期値として `toISODate(today)` を適用し、テストダブルを用いたスナップショットを作成する
  - _Requirements: 1.1, 1.2, 2.1_

- [ ] 1.1 カレンダーストリップ UI を構築する
  - `CalendarStrip` コンポーネントを追加し、7日分の日付セルと月移動ボタンを表示する
  - ARIA 属性 (`role="grid"`, `aria-selected`) とキーボード操作 (左右キー, Enter) を処理する
  - `dateUtils.test.ts` で `buildCalendarMatrix` の境界ケースを TDD で検証する
  - _Requirements: 1.1, 1.2_

- [ ] 1.2 検索入力コンポーネントを追加する
  - `SearchInput` を実装し、`useSearchDraft` フックでローカルステートを保持する
  - プレースホルダーに「キーワードで検索」を設定し、入力内容を即時反映する
  - コンポーネントテストで入力保持とリセット動作を確認する
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 1.3 セッションカード一覧のベースを整備する
  - `SessionCard` と `SessionList` を実装し、タイトル・ファイル名・メタ情報・サマリーのサンプル表示を行う
  - スケルトン (`SessionListSkeleton`) と空状態 (`EmptySessionsNotice`) の UI を用意する
  - 初期段階ではスタブデータを利用し、TDD でレンダリング挙動を固める
  - _Requirements: 2.1, 2.2, 2.3, 4.1_

- [ ] 2. データ取得フローとキャッシュフックを実装する
  - `useSessionsByDate` を作成し、`Map<string, CacheEntry>` による日付別キャッシュを保持する
  - 初回アクセス時に `sessionsApi.list` を呼び出し、レスポンスをキャッシュへ保存する
  - `force=true` 指定時やエラー後リトライ時に再フェッチするロジックを組み込む
  - _Requirements: 1.1, 1.2, 4.4_

- [ ] 2.1 データ整形と状態管理フックを実装する
  - `useSessionsViewModel` を作成し、`activeDateIso`, `searchDraft`, `status`, `items` を返す
  - API レスポンスを `SessionListItem` へ変換するフォーマッタを追加する
  - 最終成功レスポンスを保持し、ローディング・エラー時のフォールバックとして使用する
  - _Requirements: 2.1, 2.2, 4.1, 4.4_

- [ ] 2.2 エラーモデルとリトライを組み込む
  - `FetchErrorView` 型を定義し、`ApiClientError`/`ApiServerError`/`ApiNetworkError` を分類してメッセージを整形する
  - `StatusBanner` と `RetryButton` コンポーネントを実装し、エラー内容とリトライ操作を表示する
  - `useSessionsByDate.test.ts` でタイムアウトとリトライの挙動を TDD で検証する
  - _Requirements: 4.2, 4.3_

- [ ] 3. ビュー統合とルーティング連携の準備
  - `SessionsDateListView` にカレンダー・検索・一覧・エラーバナーを統合し、ステータスに応じてレンダリングを切り替える
  - セッションカード選択時に `navigateToSessionDetail` を呼び出し、将来のルータ接続に備えたトリガーを提供する
  - `App.tsx` のテストを更新し、新ビューの初期レンダリングを検証する
  - _Requirements: 2.4, 4.3, 5.1_

- [ ] 3.1 統合テストと UI ふるまいの検証
  - `SessionsDateListView.test.tsx` を作成し、MSW で正常系・空配列・クライアントエラー・サーバーエラーをモックする
  - 日付変更時に `start_date`/`end_date` が正しく送信されることをアサートする
  - エラー後のリトライでスケルトン→カード表示へ復帰することを確認する
  - _Requirements: 1.2, 4.2, 4.3, 5.1, 5.2_

- [ ] 3.2 付随ユーティリティとアクセシビリティの最終調整
  - `dateUtils.ts` のフォーマット関数を追加し、ロケール別表示に対応する
  - 日付セルやボタンにフォーカスリング・ariaラベルを設定し、アクセシビリティテストを実施する
  - `logError` ヘルパーを設け、予期しない例外をコンソール記録する
  - _Requirements: 1.2, 2.2, 4.2, 4.3_

- [ ] 4. TDD 完了チェックとドキュメント更新
  - 追加したテスト群 (ユニット/統合) がすべてグリーンになることを確認する
  - README もしくは機能ドキュメントに Sessions Date List View の追加を記載する
  - `spec.json` の `ready_for_implementation` を true に設定する
  - _Requirements: 5.1, 5.2, 5.3_

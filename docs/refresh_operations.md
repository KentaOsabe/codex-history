# インデックス再構築ジョブ運用ガイド

最終更新: 2025-10-13

## 対象環境
- 本番 (`RAILS_ENV=production`)
- ステージング (`RAILS_ENV=staging`)

## 前提条件
- `SessionsRefreshJob` は Active Job (`queue: default`) で実行され、既定では Rails の `:async` アダプタを利用する。
- 分散ジョブ実行基盤（Sidekiq など）を導入する場合は `config.active_job.queue_adapter` を切り替え、ワーカーが `default` キューを監視していることを確認する。
- ロック情報は `Rails.cache`（通常はメモリ or Redis）に `sessions/refresh_lock` キーで保存される。環境ごとに TTL (10 分) が保たれていることを確認。

## 手動トリガー手順
1. API 経由でトリガー
   ```bash
   curl -X POST "$BASE_URL/api/sessions/refresh"
   ```
   - 202 を受け取ると `data.id` にジョブIDが含まれる。
   - 409 が返る場合は既存ジョブが進行中。`errors[0].meta.job.id` で現在のジョブIDを確認する。
2. Rails コンソールから直接キューに投入する場合
   ```ruby
   SessionsRefreshJob.perform_later
   ```
   - コンソールで手動実行する場合もロックが働き、競合した呼び出しは無視される。

## 進捗監視
- API ポーリング
  ```bash
  curl "$BASE_URL/api/sessions/refresh/$JOB_ID"
  ```
  - `status` が `enqueued` のまま 10 分以上変化しない場合はワーカー停止の可能性あり。
  - ジョブ完了後は 404 (`refresh_job_not_found`) が返る。これを完了検知として利用する。
- ログ監視
  - `Rails.logger` に `"[SessionsRefreshJob] start"` / `"[SessionsRefreshJob] finish"` / `"[SessionsRefreshJob] error"` の構造化ログが出力される。
  - 例: `{"job_id":"...","duration_ms":125.4,"updated_at":"2025-10-13T12:00:02Z"}`

## エラーハンドリング
- 409 が連続する場合
  - 直近のジョブがハングしている可能性。`Rails.cache.read("sessions/refresh_lock")` で状態を確認。
  - 必要に応じて `Rails.cache.delete("sessions/refresh_lock")` でロックを強制解放する（原因調査と併せて実施）。
- ジョブ失敗時
  - ログに `"[SessionsRefreshJob] error"` が記録され、例外は再送出される。`:async` アダプタでは即座に再試行されないため、手動で再投入する。
  - 外部キューを利用している場合はリトライ設定を併用すること。

## 定期運用の推奨事項
- サーバ起動直後に `SessionsRefreshJob.perform_later` を実行し、キャッシュ未生成状態を避ける。
- 毎日深夜など負荷の低い時間帯に自動実行する場合は、外部スケジューラ（cron / Sidekiq Scheduler）から API を叩くか `perform_later` を呼び出す。
- 監視ツールで `refresh_in_progress` の 409 エラー件数や `SessionsRefreshJob` のエラーログ件数を集計し、異常を検知する。


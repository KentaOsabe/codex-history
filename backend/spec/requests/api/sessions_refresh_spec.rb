# frozen_string_literal: true

require "rails_helper"

RSpec.describe "POST /api/sessions/refresh", type: :request do
  include ActiveJob::TestHelper

  before do
    ActiveJob::Base.queue_adapter = :test
    clear_enqueued_jobs
    clear_performed_jobs
  end

  # 目的: ロック取得後にリフレッシュジョブを非同期に投入し、202とジョブ情報を返すことを保証する。
  it "セッション再インデックスジョブをキューに投入しジョブIDを返す" do
    freeze_time do
      lock = instance_double(Sessions::RefreshLock, mark_enqueued: nil, release!: nil)
      allow(Sessions::RefreshLock).to receive(:acquire).and_return(lock)

      expect { post "/api/sessions/refresh" }
        .to have_enqueued_job(SessionsRefreshJob).on_queue("default")

      expect(response).to have_http_status(:accepted)
      body = JSON.parse(response.body)

      expect(body.dig("data", "type")).to eq("job")
      expect(body.dig("data", "attributes", "status")).to eq("enqueued")
      job_id = body.dig("data", "id")
      expect(job_id).to be_present
      expect(body.dig("meta", "job", "queue")).to eq("default")
      expect(body.dig("meta", "job", "enqueued_at")).to eq(Time.current.iso8601)

      expect(Sessions::RefreshLock).to have_received(:acquire)
      expect(lock).to have_received(:mark_enqueued).with(job_id: job_id, enqueued_at: Time.current, queue: "default")
    end
  end

  # 目的: ロック取得に失敗した場合は409で既存ジョブ情報を返し、新規ジョブを投入しないことを保証する。
  it "実行中の場合は409を返しジョブを重複投入しない" do
    allow(Sessions::RefreshLock).to receive(:acquire).and_return(nil)

    expect { post "/api/sessions/refresh" }
      .not_to have_enqueued_job(SessionsRefreshJob)

    expect(response).to have_http_status(:conflict)
    body = JSON.parse(response.body)

    error = body.fetch("errors").first
    expect(error).to include(
      "code" => "refresh_in_progress",
      "status" => 409
    )
  end

  describe "GET /api/sessions/refresh/:job_id" do
    # 目的: 現在トラッキング中のジョブステータスを返し、ポーリングで進捗確認できることを保証する。
    it "ロックに記録されたジョブ情報を返す" do
      freeze_time do
        job_state = {
          job_id: "job-123",
          status: "enqueued",
          queue: "default",
          enqueued_at: Time.current,
          updated_at: Time.current
        }
        allow(Sessions::RefreshLock).to receive(:state).and_return(job_state)

        get "/api/sessions/refresh/job-123"

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)

        expect(body.dig("data", "id")).to eq("job-123")
        expect(body.dig("data", "attributes", "status")).to eq("enqueued")
        expect(body.dig("data", "attributes", "queue")).to eq("default")
        expect(body.dig("data", "attributes", "enqueued_at")).to eq(Time.current.iso8601)
        expect(body.dig("meta", "job", "updated_at")).to eq(Time.current.iso8601)
        expect(body.fetch("errors")).to eq([])
      end
    end

    # 目的: 指定したジョブIDが存在しない場合に 404 エラーを返し、ポーリング側でエラーハンドリングできることを保証する。
    it "ジョブが見つからない場合は404を返す" do
      allow(Sessions::RefreshLock).to receive(:state).and_return(nil)

      get "/api/sessions/refresh/unknown"

      expect(response).to have_http_status(:not_found)
      body = JSON.parse(response.body)
      error = body.fetch("errors").first

      expect(error).to include(
        "code" => "refresh_job_not_found",
        "status" => 404
      )
    end
  end
end

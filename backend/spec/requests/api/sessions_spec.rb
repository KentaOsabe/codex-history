# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::Sessions", type: :request do
  describe "GET /api/sessions" do
    around do |example|
      with_sessions_root(fixture: "source") do
        Sessions::CacheReader.new.refresh!
        example.run
      end
    end

    # 目的: パラメータ未指定時にセッション一覧がデフォルトソート・ページネーションで返ることを保証する
    it "パラメータ未指定時に最新順で200を返す" do
      get "/api/sessions"

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)

      expect(body).to include("data", "meta", "errors")
      expect(body["errors"]).to eq([])

      expect(body.dig("meta", "pagination", "page")).to eq(1)
      expect(body.dig("meta", "pagination", "per_page")).to eq(25)
      expect(body.dig("meta", "sort")).to eq("-created_at")

      ids = body.fetch("data").map { |item| item.fetch("id") }
      expect(ids).to eq(["2025-01-02-session-beta", "alpha-session"])

      first_attributes = body.fetch("data").first.fetch("attributes")
      expect(first_attributes).to include(
        "session_id" => "2025-01-02-session-beta",
        "relative_path" => "2025-01-02/session-beta.jsonl"
      )
    end

    # 目的: スピーカーと期間フィルタが適用され、該当セッションのみ返ることを保証する
    it "ツール呼び出しを含むセッションのみをフィルタできる" do
      get "/api/sessions", params: { speaker: "tool" }

      body = JSON.parse(response.body)

      expect(body.fetch("data").map { |item| item.fetch("id") }).to eq(["alpha-session"])
      expect(body.dig("meta", "filters", "speaker")).to eq(["tool"])
    end

    # 目的: 期間フィルタとソートキー変更がメタ情報に反映されることを保証する
    it "期間とソートパラメータで結果を絞り込み昇順ソートする" do
      get "/api/sessions", params: { start_date: "2025-01-02", end_date: "2025-01-02", sort: "duration_seconds" }

      body = JSON.parse(response.body)

      expect(body.fetch("data").map { |item| item.fetch("id") }).to eq(["2025-01-02-session-beta"])
      expect(body.dig("meta", "filters", "start_date")).to eq("2025-01-02")
      expect(body.dig("meta", "filters", "end_date")).to eq("2025-01-02")
      expect(body.dig("meta", "sort")).to eq("duration_seconds")
    end

    # 目的: ページネーション等の不正パラメータに対して 400 を返し、エラー内容が `errors.meta.invalid_fields` に格納されることを保証する
    it "不正な per_page では 400 を返す" do
      get "/api/sessions", params: { per_page: 0 }

      expect(response).to have_http_status(:bad_request)
      body = JSON.parse(response.body)

      expect(body.fetch("errors").first).to include(
        "code" => "invalid_parameters",
        "status" => 400
      )
      expect(body.fetch("errors").first.dig("meta", "invalid_fields", "per_page")).to be_present
    end

    # 目的: 未知のスピーカーロール指定時にバリデーションエラーが返却されることを保証する
    it "未知のスピーカーロールでは400を返す" do
      get "/api/sessions", params: { speaker: "unknown" }

      expect(response).to have_http_status(:bad_request)
      body = JSON.parse(response.body)

      expect(body.fetch("errors").first.dig("meta", "invalid_fields", "speaker")).to be_present
    end

    # 目的: 期間指定が逆転している場合に 422 エラーコード `invalid_period` が返ることを保証する
    it "期間の整合性が取れない場合は422を返す" do
      get "/api/sessions", params: { start_date: "2025-02-01", end_date: "2025-01-01" }

      expect(response).to have_http_status(:unprocessable_entity)
      body = JSON.parse(response.body)

      expect(body.fetch("errors").first).to include(
        "code" => "invalid_period",
        "status" => 422
      )
    end
  end

  describe "GET /api/sessions/:id" do
    around do |example|
      with_sessions_root(fixture: "source") do
        Sessions::CacheReader.new.refresh!
        example.run
      end
    end

    # 目的: 正常系でセッション詳細と正規化メッセージが取得できることを保証する
    it "詳細情報とメッセージ配列を返す" do
      get "/api/sessions/alpha-session"

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)

      expect(body.dig("data", "id")).to eq("alpha-session")
      messages = body.dig("data", "attributes", "messages")
      expect(messages).to be_an(Array)
      expect(messages.size).to be > 0

      user_message = messages.find { |message| message["role"] == "user" }
      expect(user_message.dig("segments", 0, "text")).to eq("first question")

      tool_call = messages.find { |message| message["source_type"] == "tool_call" }
      expect(tool_call.dig("tool_call", "name")).to eq("shell")

      expect(body.dig("meta", "session", "relative_path")).to eq("2025-01-01/session-alpha.jsonl")
    end

    # 目的: サニタイズ版を指定した場合にサニタイズ済みファイルが読み込まれ、メタ情報が更新されることを保証する
    it "サニタイズ variant を取得できる" do
      get "/api/sessions/alpha-session", params: { variant: "sanitized" }

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)

      expect(body.dig("data", "attributes", "relative_path")).to eq("2025-01-01/session-alpha-sanitized.jsonl")
      expect(body.dig("meta", "session", "relative_path")).to eq("2025-01-01/session-alpha-sanitized.jsonl")
    end

    # 目的: 存在しないセッションIDでは 404 と適切なエラーコードを返すことを保証する
    it "存在しないIDでは404を返す" do
      get "/api/sessions/does-not-exist"

      expect(response).to have_http_status(:not_found)
      body = JSON.parse(response.body)

      expect(body.fetch("errors").first).to include(
        "code" => "session_not_found",
        "status" => 404
      )
    end

    # 目的: 無効な variant パラメータ処理（サニタイズ版未存在）で 422 を返すことを保証する
    it "サニタイズ版が存在しない場合は422を返す" do
      get "/api/sessions/2025-01-02-session-beta", params: { variant: "sanitized" }

      expect(response).to have_http_status(:unprocessable_entity)
      body = JSON.parse(response.body)

      expect(body.fetch("errors").first).to include(
        "code" => "sanitized_variant_not_found",
        "status" => 422
      )
    end
  end
end

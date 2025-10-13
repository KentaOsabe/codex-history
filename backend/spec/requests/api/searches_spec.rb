# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::Searches", type: :request do
  describe "GET /api/search" do
    around do |example|
      with_sessions_root(fixture: "search") do
        example.run
      end
    end

    # 目的: キーワード検索でスニペットとページ情報が返却され、ハイライトが含まれることを保証する
    it "キーワード指定でハイライト付き結果を返す" do
      get "/api/search", params: { keyword: "rubocop" }

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)

      expect(body.fetch("data")).not_to be_empty

      first_result = body.fetch("data").first
      expect(first_result).to include("id", "type", "attributes")
      expect(first_result.fetch("attributes"))
        .to include("session_id", "scope", "highlight", "occurred_at")
      expect(first_result.dig("attributes", "highlight")).to match(/<mark>rubocop<\/mark>/i)

      pagination = body.dig("meta", "pagination")
      expect(pagination).to include("page" => 1, "limit" => 10)
      expect(pagination.fetch("total_count")).to be >= 2
      expect(body.dig("meta", "filters", "keyword")).to eq("rubocop")
      expect(body.dig("meta", "filters", "scope")).to eq("chat_messages")
    end

    # 目的: ページネーションパラメータが反映され、指定ページの結果のみが返ることを保証する
    it "page と limit を指定した場合に対応する結果のみを返す" do
      get "/api/search", params: { keyword: "rubocop", page: 2, limit: 1 }

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)

      expect(body.fetch("data").size).to eq(1)
      expect(body.dig("meta", "pagination", "page")).to eq(2)
      expect(body.dig("meta", "pagination", "limit")).to eq(1)
      expect(body.dig("meta", "pagination", "total_pages")).to be >= 2
    end

    # 目的: 必須パラメータ keyword がない場合に invalid_parameters エラーを返すことを保証する
    it "keyword が未指定の場合は 400 を返す" do
      get "/api/search"

      expect(response).to have_http_status(:bad_request)
      body = JSON.parse(response.body)

      error = body.fetch("errors").first
      expect(error.fetch("code")).to eq("invalid_parameters")
      expect(error.fetch("status")).to eq("400")
      expect(error.dig("meta", "invalid_fields", "keyword")).to be_present
    end

    # 目的: limit が許容範囲外の場合に 400 エラーとなり、フィールドエラーが含まれることを保証する
    it "limit が上限を超える場合は 400 を返す" do
      get "/api/search", params: { keyword: "rubocop", limit: 99 }

      expect(response).to have_http_status(:bad_request)
      body = JSON.parse(response.body)

      error = body.fetch("errors").first
      expect(error.fetch("code")).to eq("invalid_parameters")
      expect(error.fetch("status")).to eq("400")
      expect(error.dig("meta", "invalid_fields", "limit")).to be_present
    end

    # 目的: 未対応スコープ指定時に 400 エラーが返ることを保証する
    it "未対応スコープの場合は 400 を返す" do
      get "/api/search", params: { keyword: "rubocop", scope: "unknown" }

      expect(response).to have_http_status(:bad_request)
      body = JSON.parse(response.body)

      error = body.fetch("errors").first
      expect(error.fetch("code")).to eq("invalid_parameters")
      expect(error.fetch("status")).to eq("400")
      scope_errors = error.dig("meta", "invalid_fields", "scope")
      expect(scope_errors).to be_present
      expect(scope_errors.first).to include("is not included")
    end
  end
end

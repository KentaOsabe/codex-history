# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::ErrorHandling", type: :request do
  describe "GET /api/sessions/:id" do
    around do |example|
      with_sessions_root(fixture: "source") do
        Sessions::CacheReader.new.refresh!
        example.run
      end
    end

    # 目的: 想定外の例外が発生した場合でも500エラーが共通フォーマットで返り、エラーログが出力されることを保証する
    it "500 エラーを共通フォーマットで返しログ出力する" do
      allow_any_instance_of(Sessions::DetailBuilder).to receive(:build).and_raise(StandardError, "boom")
      expect(Rails.logger).to receive(:error).at_least(:once).with(include("boom"))

      get "/api/sessions/alpha-session"

      expect(response).to have_http_status(:internal_server_error)

      body = JSON.parse(response.body)
      error = body.fetch("errors").first

      expect(error.fetch("code")).to eq("internal_server_error")
      expect(error.fetch("status")).to eq("500")
      expect(error.fetch("title")).to eq("Internal Server Error")
      expect(error.fetch("detail")).to include("boom")
    end
  end
end

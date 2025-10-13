# frozen_string_literal: true

require "rails_helper"

RSpec.describe Search::KeywordSearcher do
  subject(:searcher) { described_class.new }

  around do |example|
    with_sessions_root(fixture: "search") do
      example.run
    end
  end

  describe "#search" do
    # 目的: サニタイズ版を優先しつつ最新順でハイライト付き結果を返すことを保証する
    it "サニタイズ済みメッセージとオリジナルを含めて最新順に返す" do
      result = searcher.search(keyword: "rubocop", scope: "chat_messages", page: 1, limit: 10)

      expect(result[:total_count]).to eq(4)
      expect(result[:items].size).to eq(4)

      timestamps = result[:items].map { |item| item[:occurred_at] }
      expect(timestamps).to eq(timestamps.sort.reverse)

      sanitized_entry = result[:items].find { |item| item[:session_id] == "session-search-one" }
      expect(sanitized_entry[:relative_path]).to eq("2025-03-01/session-search-one-sanitized.jsonl")
      expect(sanitized_entry[:highlight]).to match(/<mark>rubocop<\/mark>/i)

      fallback_entry = result[:items].find { |item| item[:session_id] == "session-search-two" }
      expect(fallback_entry[:relative_path]).to eq("2025-03-02/session-search-two.jsonl")
    end

    # 目的: キーワードの大文字小文字差異を吸収して一致させることを保証する
    it "大文字小文字を無視して検索する" do
      mixed_case = searcher.search(keyword: "RuBoCoP", scope: "chat_messages", page: 1, limit: 10)

      expect(mixed_case[:total_count]).to eq(4)
      expect(mixed_case[:items].all? { |item| item[:highlight].match?(/<mark>rubocop<\/mark>/i) }).to be(true)
    end

    # 目的: ページネーション指定が結果数と件数情報に反映されることを保証する
    it "limit と page を考慮して結果を返す" do
      paginated = searcher.search(keyword: "rubocop", scope: "chat_messages", page: 2, limit: 2)

      expect(paginated[:items].size).to eq(2)
      expect(paginated[:total_count]).to eq(4)
      expect(paginated[:total_pages]).to eq(2)

      second_page_first = paginated[:items].first
      expect(second_page_first[:occurrence_index]).to eq(3)
    end
  end
end

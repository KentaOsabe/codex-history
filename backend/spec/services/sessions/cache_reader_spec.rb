# frozen_string_literal: true

require "rails_helper"

RSpec.describe Sessions::CacheReader do
  describe "#index" do
    # 目的: Indexer を経由してセッションメタデータとキャッシュ情報が取得できることを保証する
    it "インデックスを読み込みセッション一覧を返す" do
      with_sessions_root do
        reader = described_class.new

        index = reader.index

        expect(index[:sessions].size).to eq(2)
        expect(index[:added]).to be_an(Array)
        expect(index[:updated_at]).to be_a(Time)
      end
    end
  end

  describe "#session_by_id" do
    # 目的: キャッシュ経由で特定セッションのメタデータを取得できることを保証する
    it "session_id からエントリを取得できる" do
      with_sessions_root do
        reader = described_class.new

        entry = reader.session_by_id("alpha-session")

        expect(entry[:relative_path]).to eq("2025-01-01/session-alpha.jsonl")
        expect(entry[:has_sanitized_variant]).to eq(true)
      end
    end
  end
end

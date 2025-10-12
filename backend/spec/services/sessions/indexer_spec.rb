# frozen_string_literal: true

require "rails_helper"
require "tmpdir"
require "json"

RSpec.describe Sessions::Indexer do
  describe "#refresh" do
    # 目的: 初回インデックス実行時に全セッションが追加扱いとなりキャッシュが生成されることを保証する。
    it "初回実行で全セッションを追加として返しキャッシュを保存する" do
      with_sessions_root do
        Dir.mktmpdir do |tmp|
          cache_path = Pathname.new(tmp).join("sessions_index.json")
          indexer = described_class.new(cache_path: cache_path)

          result = indexer.refresh

          expect(result[:sessions].map { |session| session[:session_id] }).to contain_exactly(
            "alpha-session",
            "2025-01-02-session-beta"
          )
          expect(result[:added]).to match_array(%w[2025-01-01/session-alpha.jsonl 2025-01-02/session-beta.jsonl])
          expect(result[:updated]).to be_empty
          expect(result[:removed]).to be_empty
          expect(result[:failed_entries]).to be_empty
          expect(result[:updated_at]).to be_a(Time)
          expect(cache_path).to exist
        end
      end
    end

    # 目的: 変更が無い場合に差分が発生しないことを保証し、不要な再計算を防ぐ。
    it "キャッシュが最新の場合は差分を返さない" do
      with_sessions_root do |root|
        Dir.mktmpdir do |tmp|
          cache_path = Pathname.new(tmp).join("sessions_index.json")
          described_class.new(cache_path: cache_path).refresh

          result = described_class.new(cache_path: cache_path).refresh

          expect(result[:added]).to be_empty
          expect(result[:updated]).to be_empty
          expect(result[:removed]).to be_empty
          expect(result[:sessions].size).to eq(2)
        end
      end
    end

    # 目的: ファイル更新時に `updated` が検出されメタデータが最新化されることを保証する。
    it "ファイル更新を検知して updated に含める" do
      with_sessions_root do |root|
        Dir.mktmpdir do |tmp|
          cache_path = Pathname.new(tmp).join("sessions_index.json")
          indexer = described_class.new(cache_path: cache_path)
          indexer.refresh

          target = root.join("2025-01-01/session-alpha.jsonl")
          target.open("a") { |file| file.puts({ timestamp: "2025-01-01T09:01:00.000Z", type: "event_msg", payload: { kind: "token_count", total: 99 } }.to_json) }

          result = described_class.new(cache_path: cache_path).refresh

          expect(result[:updated]).to contain_exactly("2025-01-01/session-alpha.jsonl")
          expect(result[:added]).to be_empty
          expect(result[:removed]).to be_empty
          alpha = result[:sessions].find { |session| session[:relative_path] == "2025-01-01/session-alpha.jsonl" }
          expect(alpha[:meta_event_count]).to eq(2)
        end
      end
    end

    # 目的: セッションファイル削除時に `removed` が検出されキャッシュから除外できることを保証する。
    it "削除されたファイルを removed に含める" do
      with_sessions_root do |root|
        Dir.mktmpdir do |tmp|
          cache_path = Pathname.new(tmp).join("sessions_index.json")
          indexer = described_class.new(cache_path: cache_path)
          indexer.refresh

          File.delete(root.join("2025-01-02/session-beta.jsonl"))

          result = described_class.new(cache_path: cache_path).refresh

          expect(result[:removed]).to contain_exactly("2025-01-02/session-beta.jsonl")
          expect(result[:sessions].map { |session| session[:relative_path] }).to contain_exactly("2025-01-01/session-alpha.jsonl")
        end
      end
    end

    # 目的: 破損ファイルが存在しても処理継続し、失敗情報が `failed_entries` に記録されることを保証する。
    it "破損ファイルがあっても残りを処理し failed_entries に記録する" do
      with_sessions_root(fixture: "corrupted") do
        Dir.mktmpdir do |tmp|
          cache_path = Pathname.new(tmp).join("sessions_index.json")
          result = described_class.new(cache_path: cache_path).refresh

          expect(result[:sessions]).to be_empty
          expect(result[:failed_entries].length).to eq(1)
          failure = result[:failed_entries].first
          expect(failure[:relative_path]).to eq("2025-03-01/broken.jsonl")
          expect(failure[:error_class]).to eq("Sessions::Errors::InvalidPayload")
          expect(result[:added]).to be_empty
        end
      end
    end
  end
end

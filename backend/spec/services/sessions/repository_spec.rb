# frozen_string_literal: true

require "rails_helper"
require "securerandom"
require "tmpdir"

RSpec.describe Sessions::Repository do
  describe "#scan" do
    # 目的: 正常なログディレクトリを走査し、Issue要件で定義したメタデータが網羅的に取得できることを保証する。
    it "JSONL ファイルを走査してメタデータを返す" do
      with_sessions_root do
        repository = described_class.new

        entries = repository.scan

        expect(entries.map { |entry| entry[:session_id] }).to contain_exactly(
          "alpha-session",
          "2025-01-02-session-beta"
        )

        alpha = entries.find { |entry| entry[:session_id] == "alpha-session" }
        beta = entries.find { |entry| entry[:session_id] == "2025-01-02-session-beta" }

        expect(alpha[:relative_path]).to eq("2025-01-01/session-alpha.jsonl")
        expect(alpha[:absolute_path]).to end_with("/2025-01-01/session-alpha.jsonl")
        expect(alpha[:message_count]).to eq(2)
        expect(alpha[:tool_call_count]).to eq(1)
        expect(alpha[:tool_result_count]).to eq(1)
        expect(alpha[:reasoning_count]).to eq(1)
        expect(alpha[:meta_event_count]).to eq(1)
        expect(alpha[:filesize_bytes]).to be > 0
        expect(alpha[:has_sanitized_variant]).to eq(true)
        expect(alpha[:created_at]).to eq(Time.utc(2025, 1, 1, 9, 0, 0))
        expect(alpha[:completed_at]).to eq(Time.utc(2025, 1, 1, 9, 0, 10))
        expect(alpha[:duration_seconds]).to eq(10.0)
        expect(alpha[:modified_at]).to be_a(Time)
        expect(alpha[:checksum_sha256]).to match(/\A[a-f0-9]{64}\z/)
        expect(alpha[:source_format]).to eq("jsonl_v2")
        expect(alpha[:speaker_roles]).to match_array(%w[assistant system tool user])
        expect(alpha[:sanitized_relative_path]).to eq("2025-01-01/session-alpha-sanitized.jsonl")
        expect(alpha[:raw_session_meta]).to include("type" => "session_meta")

        expect(beta[:relative_path]).to eq("2025-01-02/session-beta.jsonl")
        expect(beta[:session_id]).to eq("2025-01-02-session-beta")
        expect(beta[:message_count]).to eq(2)
        expect(beta[:tool_call_count]).to eq(0)
        expect(beta[:tool_result_count]).to eq(0)
        expect(beta[:reasoning_count]).to eq(0)
        expect(beta[:meta_event_count]).to eq(1)
        expect(beta[:has_sanitized_variant]).to eq(false)
        expect(beta[:sanitized_relative_path]).to be_nil
        expect(beta[:speaker_roles]).to match_array(%w[assistant user])
        expect(beta[:created_at]).to eq(Time.utc(2025, 1, 2, 15, 10, 0))
        expect(beta[:completed_at]).to eq(Time.utc(2025, 1, 2, 15, 10, 5))
        expect(beta[:duration_seconds]).to eq(5.0)
      end
    end
  end

  describe ".resolve_root" do
    # 目的: ルートパス未設定時は環境変数の必須要件に従い MissingRoot を返すことを保証する。
    it "環境変数 CODEX_SESSIONS_ROOT が存在しない場合に MissingRoot を送出する" do
      previous = ENV["CODEX_SESSIONS_ROOT"]
      ENV.delete("CODEX_SESSIONS_ROOT")

      expect { described_class.new.scan }.to raise_error(Sessions::Errors::MissingRoot)
    ensure
      if previous
        ENV["CODEX_SESSIONS_ROOT"] = previous
      else
        ENV.delete("CODEX_SESSIONS_ROOT")
      end
    end

    # 目的: 指定されたルートディレクトリが存在しない場合にエラー検知できることを保証する。
    it "指定ディレクトリが存在しない場合に MissingRoot を送出する" do
      previous = ENV["CODEX_SESSIONS_ROOT"]

      Dir.mktmpdir do |tmp|
        missing = File.join(tmp, "missing-#{SecureRandom.hex(4)}")
        ENV["CODEX_SESSIONS_ROOT"] = missing

        expect { described_class.new.scan }.to raise_error(Sessions::Errors::MissingRoot)
      end
    ensure
      if previous
        ENV["CODEX_SESSIONS_ROOT"] = previous
      else
        ENV.delete("CODEX_SESSIONS_ROOT")
      end
    end
  end

  describe ".default_root" do
    # 目的: デフォルトのログディレクトリが README 要件どおり `~/.codex/sessions` であることを保証する。
    it "ホームディレクトリ配下の .codex/sessions を指す" do
      expect(described_class.default_root).to eq(File.expand_path("~/.codex/sessions"))
    end
  end
end

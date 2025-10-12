# frozen_string_literal: true

require "rails_helper"

RSpec.describe Sessions::StreamReader do
  describe "#summary_for" do
    # 目的: 正常な JSONL をストリーミング解析し、要件で定義した統計情報が得られることを保証する。
    it "JSONL をストリーミング解析して統計情報を返す" do
      with_sessions_root do |root|
        reader = described_class.new

        summary = reader.summary_for(root.join("2025-01-01/session-alpha.jsonl"))

        expect(summary.session_id).to eq("alpha-session")
        expect(summary.first_timestamp).to eq(Time.utc(2025, 1, 1, 9, 0, 0))
        expect(summary.last_timestamp).to eq(Time.utc(2025, 1, 1, 9, 0, 10))
        expect(summary.message_count).to eq(2)
        expect(summary.tool_call_count).to eq(1)
        expect(summary.tool_result_count).to eq(1)
        expect(summary.reasoning_count).to eq(1)
        expect(summary.meta_event_count).to eq(1)
        expect(summary.source_format).to eq("jsonl_v2")
        expect(summary.raw_session_meta["payload"]["cwd"]).to eq("/workspace")
        expect(summary.speaker_roles).to match_array(%w[assistant system tool user])
      end
    end

    # 目的: セッションメタデータが欠落している場合でもファイル名からセッションID推測が行えることを保証する。
    it "セッションメタが無い場合はファイル名から ID を推測する" do
      with_sessions_root do |root|
        reader = described_class.new

        summary = reader.summary_for(root.join("2025-01-02/session-beta.jsonl"))

        expect(summary.session_id).to eq("2025-01-02-session-beta")
        expect(summary.first_timestamp).to eq(Time.utc(2025, 1, 2, 15, 10, 0))
        expect(summary.last_timestamp).to eq(Time.utc(2025, 1, 2, 15, 10, 5))
        expect(summary.message_count).to eq(2)
        expect(summary.meta_event_count).to eq(1)
        expect(summary.speaker_roles).to match_array(%w[assistant user])
      end
    end

    # 目的: 壊れた JSON 行を検知し、InvalidPayload 例外を発生させて行番号情報を提供することを保証する。
    it "不正な JSON 行では InvalidPayload を送出する" do
      with_sessions_root(fixture: "corrupted") do |root|
        reader = described_class.new
        path = root.join("2025-03-01/broken.jsonl")

        expect { reader.summary_for(path) }.to raise_error(Sessions::Errors::InvalidPayload, /line 3/)
      end
    end
  end

  describe "#each_event" do
    # 目的: イテレータAPIが一件ずつイベントを供給しメモリアクセスを限定できることを保証する。
    it "Enumerator を返し1行ずつ解析する" do
      with_sessions_root do |root|
        reader = described_class.new

        enumerator = reader.each_event(root.join("2025-01-01/session-alpha.jsonl"))

        expect(enumerator).to be_a(Enumerator)
        first = enumerator.next
        expect(first["type"]).to eq("session_meta")
        expect(enumerator.next["payload"]["role"]).to eq("user")
      end
    end
  end
end

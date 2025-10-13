# frozen_string_literal: true

require "rails_helper"

RSpec.describe Sessions::NormalizedMessageBuilder do
  describe "#build" do
    let(:stream_reader) { instance_double(Sessions::StreamReader) }
    let(:builder) { described_class.new(stream_reader: stream_reader) }

    let(:events) do
      [
        {
          "timestamp" => "2025-01-01T00:00:00Z",
          "type" => "response_item",
          "payload" => {
            "type" => "message",
            "role" => "assistant",
            "content" => [
              {
                "type" => "output_text",
                "text" => '<p>Hello<script>alert("xss")</script><img src="/x" onerror="alert(1)">world</p><pre><code class="language-ruby">puts "hi"</code></pre>'
              }
            ]
          }
        }
      ]
    end

    before do
      allow(stream_reader).to receive(:each_event) do |path|
        expect(path).to eq("/tmp/session.jsonl")
        events.each
      end
    end

    # 目的: サニタイズ variant では危険な HTML 要素が除去され、コードブロックは保持されることを保証する
    it "サニタイズ指定時に危険タグと属性を除去する" do
      messages = builder.build(
        path: "/tmp/session.jsonl",
        relative_path: "2025-01-01/session-alpha-sanitized.jsonl",
        sanitize: true
      )

      segment_text = messages.first.fetch("segments").first.fetch("text")

      expect(segment_text).not_to include("<script")
      expect(segment_text).not_to include("onerror=")
      expect(segment_text).to include("<code")
      expect(segment_text).to include("puts")
    end

    # 目的: オリジナル variant では元のメッセージがそのまま返ることを保証する
    it "サニタイズなしでは元の HTML を保持する" do
      messages = builder.build(
        path: "/tmp/session.jsonl",
        relative_path: "2025-01-01/session-alpha.jsonl",
        sanitize: false
      )

      segment_text = messages.first.fetch("segments").first.fetch("text")

      expect(segment_text).to include("<script")
      expect(segment_text).to include("onerror=")
    end
  end
end

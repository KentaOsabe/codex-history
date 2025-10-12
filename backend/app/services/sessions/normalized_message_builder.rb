# frozen_string_literal: true

require "json"
require "time"

module Sessions
  class NormalizedMessageBuilder
    def initialize(stream_reader: Sessions::StreamReader.new)
      @stream_reader = stream_reader
    end

    def build(path:, relative_path:)
      messages = []

      stream_reader.each_event(path).with_index(1) do |event, line_index|
        normalized = normalize_event(event, line_index: line_index, relative_path: relative_path)
        messages << normalized if normalized
      end

      messages
    end

    private

    attr_reader :stream_reader

    def normalize_event(event, line_index:, relative_path:)
      event_type = event["type"]
      payload = event["payload"] || {}
      timestamp = extract_timestamp(event["timestamp"])
      base = {
        "id" => build_id(timestamp, line_index),
        "timestamp" => timestamp&.iso8601,
        "source_type" => source_type_for(event_type, payload),
        "role" => role_for(event_type, payload),
        "segments" => segments_for(event_type, payload),
        "tool_call" => tool_call_for(event_type, payload),
        "raw" => raw_payload(event_type, payload, relative_path, line_index)
      }

      case event_type
      when "session_meta", "turn_context"
        base.merge!("segments" => [], "role" => "system")
      when "event_msg"
        base["raw"]["metadata"] = payload
      when "response_item"
        case payload["type"]
        when "reasoning"
          base["raw"]["encrypted_content"] = payload["content"]
        end
      end

      base
    rescue JSON::ParserError
      base
    end

    def extract_timestamp(value)
      return if value.nil? || value.to_s.strip.empty?

      Time.iso8601(value).utc
    rescue ArgumentError
      nil
    end

    def build_id(timestamp, line_index)
      if timestamp
        "#{timestamp.iso8601}##{line_index}"
      else
        "line-#{line_index}"
      end
    end

    def source_type_for(event_type, payload)
      case event_type
      when "response_item"
        case payload["type"]
        when "message"
          "message"
        when "function_call", "custom_tool_call"
          "tool_call"
        when "function_call_output", "custom_tool_call_output"
          "tool_result"
        when "reasoning"
          "meta"
        else
          "message"
        end
      when "event_msg"
        "meta"
      when "session_meta", "turn_context"
        "session"
      else
        "meta"
      end
    end

    def role_for(event_type, payload)
      case event_type
      when "response_item"
        case payload["type"]
        when "message"
          payload["role"] || "meta"
        when "function_call", "custom_tool_call", "function_call_output", "custom_tool_call_output"
          "tool"
        when "reasoning"
          "assistant"
        else
          "meta"
        end
      when "session_meta"
        "system"
      when "event_msg"
        "meta"
      when "turn_context"
        "system"
      else
        "meta"
      end
    end

    def segments_for(event_type, payload)
      return [] unless event_type == "response_item" && payload.is_a?(Hash)

      case payload["type"]
      when "message"
        Array(payload["content"]).filter_map do |segment|
          text = segment["text"]
          next if text.nil?

          {
            "channel" => segment_channel(segment["type"]),
            "type" => "text",
            "format" => segment["type"],
            "text" => text
          }
        end
      else
        []
      end
    end

    def segment_channel(format)
      return "meta" unless format

      format.start_with?("input") ? "input" : "output"
    end

    def tool_call_for(event_type, payload)
      return unless event_type == "response_item"

      case payload["type"]
      when "function_call", "custom_tool_call"
        {
          "call_id" => payload["call_id"],
          "name" => payload["name"],
          "arguments" => payload["arguments"],
          "arguments_json" => safe_parse_json(payload["arguments"]),
          "status" => payload["status"]
        }
      when "function_call_output", "custom_tool_call_output"
        {
          "call_id" => payload["call_id"],
          "output" => payload["output"],
          "output_json" => safe_parse_json(payload["output"])
        }
      end
    end

    def raw_payload(event_type, payload, relative_path, line_index)
      {
        "event_type" => event_type,
        "payload_type" => payload.is_a?(Hash) ? payload["type"] : nil,
        "relative_path" => relative_path,
        "line_index" => line_index
      }
    end

    def safe_parse_json(value)
      return nil unless value.is_a?(String)

      JSON.parse(value)
    rescue JSON::ParserError
      nil
    end
  end
end

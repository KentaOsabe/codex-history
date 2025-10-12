# frozen_string_literal: true

require "json"
require "time"
require "pathname"
require "set"

module Sessions
  class StreamReader
    Summary = Struct.new(
      :session_id,
      :first_timestamp,
      :last_timestamp,
      :message_count,
      :tool_call_count,
      :tool_result_count,
      :reasoning_count,
      :meta_event_count,
      :source_format,
      :raw_session_meta,
      :speaker_roles,
      keyword_init: true
    )

    def each_event(path, &block)
      return enum_for(:each_event, path) unless block

      validate_file!(path)
      File.foreach(path).with_index(1) do |line, index|
        next if line.strip.empty?

        begin
          event = JSON.parse(line)
        rescue JSON::ParserError => e
          raise Sessions::Errors::InvalidPayload, "Malformed JSON at line #{index}: #{e.message}"
        end

        yield event
      end
    end

    def summary_for(path)
      validate_file!(path)
      SummaryBuilder.new(self, Pathname.new(path)).build
    end

    private

    def validate_file!(path)
      pathname = Pathname.new(path)
      raise Sessions::Errors::UnreadableFile, "File not found: #{pathname}" unless pathname.exist?
      raise Sessions::Errors::UnreadableFile, "Unreadable file: #{pathname}" unless pathname.readable?
    end

    def parse_timestamp(value)
      return unless value

      Time.iso8601(value).utc
    rescue ArgumentError
      nil
    end

    def derive_session_id(pathname)
      directory = pathname.dirname.basename.to_s
      base = pathname.basename(".jsonl").to_s
      return base if directory.empty? || directory == "."

      "#{directory}-#{base}"
    end

    def birthtime_utc(pathname)
      Time.at(File.birthtime(pathname)).utc
    rescue NotImplementedError, Errno::ENOENT
      pathname.mtime.utc
    end

    class SummaryBuilder
      def initialize(reader, pathname)
        @reader = reader
        @pathname = pathname
        @counts = Hash.new(0)
        @first_timestamp = nil
        @last_timestamp = nil
        @session_id = nil
        @raw_meta = nil
        @speaker_roles = Set.new
      end

      def build
        reader.each_event(pathname) do |event|
          timestamp = reader.send(:parse_timestamp, event["timestamp"])
          @first_timestamp ||= timestamp
          @last_timestamp = timestamp if timestamp

          if event["type"] == "session_meta"
            @session_id ||= event.dig("payload", "id")
            @raw_meta ||= event
            speaker_roles << "system"
          end

          case event["type"]
          when "response_item"
            increment_response_counts(event["payload"])
          when "event_msg"
            counts[:meta_event_count] += 1
          end
        end

        Summary.new(
          session_id: @session_id || reader.send(:derive_session_id, pathname),
          first_timestamp: @first_timestamp || reader.send(:birthtime_utc, pathname),
          last_timestamp: @last_timestamp || pathname.mtime.utc,
          message_count: counts[:message_count],
          tool_call_count: counts[:tool_call_count],
          tool_result_count: counts[:tool_result_count],
          reasoning_count: counts[:reasoning_count],
          meta_event_count: counts[:meta_event_count],
          source_format: "jsonl_v2",
          raw_session_meta: @raw_meta,
          speaker_roles: speaker_roles.to_a.sort
        )
      end

      private

      attr_reader :reader, :pathname, :counts, :speaker_roles

      def increment_response_counts(payload)
        return unless payload.is_a?(Hash)

        case payload["type"]
        when "message"
          counts[:message_count] += 1
          speaker_roles << payload["role"].to_s if payload["role"].present?
        when "function_call", "custom_tool_call"
          counts[:tool_call_count] += 1
          speaker_roles << "tool"
        when "function_call_output", "custom_tool_call_output"
          counts[:tool_result_count] += 1
          speaker_roles << "tool"
        when "reasoning"
          counts[:reasoning_count] += 1
          speaker_roles << "assistant"
        end
      end
    end
  end
end

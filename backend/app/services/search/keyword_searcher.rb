# frozen_string_literal: true

require "pathname"
require "time"

module Search
  class KeywordSearcher
    DEFAULT_SCOPE = "chat_messages"
    SUPPORTED_SCOPES = [ DEFAULT_SCOPE ].freeze
    HIGHLIGHT_CONTEXT_WORDS = 10
    ELLIPSIS = "…"

    def initialize(
      repository: Sessions::Repository.new,
      message_builder: Sessions::NormalizedMessageBuilder.new,
      clock: -> { Process.clock_gettime(Process::CLOCK_MONOTONIC) }
    )
      @repository = repository
      @message_builder = message_builder
      @clock = clock
    end

    def search(keyword:, scope:, page:, limit:)
      started_at = clock.call
      matches = gather_matches(keyword: keyword, scope: scope)
      sorted = sort_matches(matches)
      annotate_occurrence(sorted)

      total_count = sorted.size
      total_pages = total_pages_for(total_count, limit)
      offset = (page - 1) * limit
      paged_items = sorted.slice(offset, limit) || []
      duration_ms = ((clock.call - started_at) * 1000).round(3)

      {
        items: paged_items,
        total_count: total_count,
        total_pages: total_pages,
        duration_ms: duration_ms
      }
    end

    private

    attr_reader :repository, :message_builder, :clock

    def gather_matches(keyword:, scope:)
      regex = build_keyword_regex(keyword)
      entries = repository.scan

      entries.each_with_object([]) do |entry, acc|
        path_info = path_for(entry)
        next unless path_info

        messages_for(path_info).each do |message|
          next unless matches_scope?(message, scope)

          text = extract_text(message)
          next if text.blank?
          next unless regex.match?(text)

          highlight = build_highlight(text, regex)
          next unless highlight

          occurred_at = parse_timestamp(message["timestamp"]) || entry[:created_at]
          acc << build_result(entry, message, path_info, scope: scope, highlight: highlight, occurred_at: occurred_at)
        end
      end
    end

    def path_for(entry)
      relative_path = entry[:sanitized_relative_path].presence || entry[:relative_path]
      absolute_path = if entry[:sanitized_relative_path].present?
        repository.resolve_root.join(entry[:sanitized_relative_path])
      else
        Pathname.new(entry[:absolute_path])
      end

      return unless absolute_path.exist?

      {
        relative_path: relative_path,
        absolute_path: absolute_path,
        variant: entry[:sanitized_relative_path].present? ? :sanitized : :original
      }
    end

    def messages_for(path_info)
      message_builder.build(
        path: path_info[:absolute_path].to_s,
        relative_path: path_info[:relative_path],
        sanitize: path_info[:variant] == :sanitized
      )
    rescue Sessions::Errors::UnreadableFile, Sessions::Errors::InvalidPayload
      []
    end

    def matches_scope?(message, scope)
      case scope
      when DEFAULT_SCOPE
        message.fetch("segments", []).any?
      else
        false
      end
    end

    def extract_text(message)
      Array(message["segments"]).filter_map { |segment| segment["text"]&.to_s }.join(" ").presence
    end

    def build_highlight(text, regex)
      return unless text

      words = text.split(/\s+/)
      return if words.empty?

      match_index = words.index { |word| regex.match?(word) }
      return unless match_index

      start_idx = [ match_index - HIGHLIGHT_CONTEXT_WORDS, 0 ].max
      end_idx = [ match_index + HIGHLIGHT_CONTEXT_WORDS, words.size - 1 ].min
      snippet_words = words[start_idx..end_idx]
      snippet = snippet_words.join(" ")

      highlighted = snippet.gsub(regex) { |match| "<mark>#{match}</mark>" }
      prefix = start_idx.positive? ? ELLIPSIS : nil
      suffix = end_idx < (words.size - 1) ? ELLIPSIS : nil

      [ prefix, highlighted, suffix ].compact.join(" ")
    end

    def build_result(entry, message, path_info, scope:, highlight:, occurred_at:)
      {
        result_id: build_result_id(entry[:session_id], message["id"]),
        session_id: entry[:session_id],
        scope: scope,
        highlight: highlight,
        occurred_at: occurred_at,
        message_role: message["role"],
        message_id: message["id"],
        relative_path: path_info[:relative_path]
      }
    end

    def sort_matches(matches)
      matches.sort_by { |item| sortable_time(item[:occurred_at]) }.reverse
    end

    def sortable_time(value)
      value || Time.at(0)
    end

    def annotate_occurrence(matches)
      matches.each_with_index do |item, index|
        occurrence = index + 1
        item[:occurrence_index] = occurrence
        item[:result_id] = build_result_id(item[:session_id], item[:message_id], occurrence)
      end
    end

    def total_pages_for(total_count, limit)
      return 0 if total_count.zero?

      (total_count / limit.to_f).ceil
    end

    def build_result_id(session_id, message_id, occurrence = nil)
      base = [ session_id, message_id ].compact.join(":")
      occurrence ? "#{base}:#{occurrence}" : base
    end

    def build_keyword_regex(keyword)
      escaped = Regexp.escape(keyword.to_s)
      Regexp.new(escaped, Regexp::IGNORECASE)
    end

    def parse_timestamp(value)
      return if value.blank?

      Time.iso8601(value)
    rescue ArgumentError
      nil
    end
  end
end

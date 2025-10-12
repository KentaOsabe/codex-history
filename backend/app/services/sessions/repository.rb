# frozen_string_literal: true

require "digest"
require "pathname"

module Sessions
  class Repository
    DEFAULT_SIGNATURE_FORMAT = "%<mtime>s:%<size>s".freeze

    def initialize(root: nil, stream_reader: Sessions::StreamReader.new)
      @root = root
      @stream_reader = stream_reader
    end

    def scan(capture_errors: false)
      entries = []
      failures = []

      each_session_file do |path|
        begin
          entries << build_entry(path)
        rescue Sessions::Errors::InvalidPayload, Sessions::Errors::UnreadableFile => e
          raise unless capture_errors

          failures << {
            relative_path: relative_path(path),
            error_class: e.class.name,
            message: e.message
          }
        end
      end

      capture_errors ? [ entries, failures ] : entries
    end

    def self.default_root
      File.expand_path("~/.codex/sessions")
    end

    def resolve_root
      @resolved_root ||= begin
        resolved = (@root || ENV["CODEX_SESSIONS_ROOT"] || self.class.default_root)
        raise Sessions::Errors::MissingRoot, "CODEX_SESSIONS_ROOT is not set" if resolved.nil? || resolved.to_s.strip.empty?

        resolved_path = Pathname.new(resolved)
        raise Sessions::Errors::MissingRoot, "Sessions root does not exist: #{resolved}" unless resolved_path.exist?
        raise Sessions::Errors::MissingRoot, "Sessions root is not a directory: #{resolved}" unless resolved_path.directory?

        resolved_path
      end
    end

    private

    attr_reader :stream_reader

    def each_session_file(&block)
      root = resolve_root
      Dir.glob(root.join("**", "*.jsonl")).sort.each do |path|
        next if path.end_with?("-sanitized.jsonl")

        block.call(Pathname.new(path))
      end
    end

    def build_entry(path)
      summary = stream_reader.summary_for(path.to_s)
      absolute_path = path.realpath.to_s
      rel_path = relative_path(path)
      filesize = path.size
      modified_at = path.mtime.utc
      created_at = (summary.first_timestamp || file_birthtime(path))&.utc
      completed_at = (summary.last_timestamp || modified_at)&.utc
      duration = if created_at && completed_at
                   [ completed_at - created_at, 0 ].max.to_f
      else
                   0.0
      end

      {
        session_id: summary.session_id,
        relative_path: rel_path,
        absolute_path: absolute_path,
        filesize_bytes: filesize,
        modified_at: modified_at,
        created_at: created_at,
        completed_at: completed_at,
        duration_seconds: duration,
        message_count: summary.message_count,
        tool_call_count: summary.tool_call_count,
        tool_result_count: summary.tool_result_count,
        reasoning_count: summary.reasoning_count,
        meta_event_count: summary.meta_event_count,
        checksum_sha256: Digest::SHA256.file(path.to_s).hexdigest,
        source_format: summary.source_format,
        has_sanitized_variant: sanitized_variant?(path),
        signature: build_signature(path)
      }
    end

    def relative_path(path)
      path.relative_path_from(resolve_root).to_s
    end

    def build_signature(path)
      format(DEFAULT_SIGNATURE_FORMAT, mtime: path.mtime.to_i, size: path.size)
    end

    def sanitized_variant?(path)
      sanitized = path.sub_ext("-sanitized.jsonl")
      File.exist?(sanitized.to_s)
    end

    def file_birthtime(path)
      path.birthtime
    rescue NotImplementedError
      path.mtime
    end
  end
end

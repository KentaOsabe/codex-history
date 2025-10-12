# frozen_string_literal: true

require "digest"

module Sessions
  class DetailBuilder
    def initialize(
      repository: Sessions::Repository.new,
      message_builder: Sessions::NormalizedMessageBuilder.new,
      cache_reader: Sessions::CacheReader.new
    )
      @repository = repository
      @message_builder = message_builder
      @cache_reader = cache_reader
    end

    def build(session_id:, variant: :original)
      entry = cache_reader.session_by_id(session_id)
      raise Sessions::Errors::UnreadableFile, "Session not found" unless entry

      variant = normalize_variant(variant)
      path_info = resolve_path(entry, variant: variant)

      messages = message_builder.build(path: path_info[:absolute_path], relative_path: path_info[:relative_path])
      variant_metadata = metadata_for(entry, path_info: path_info)

      {
        attributes: detail_attributes(entry, path_info: path_info, messages: messages, variant_metadata: variant_metadata),
        meta: detail_meta(entry, path_info: path_info, variant_metadata: variant_metadata)
      }
    end

    private

    attr_reader :repository, :message_builder, :cache_reader

    VARIANTS = {
      original: "original",
      sanitized: "sanitized"
    }.freeze

    def normalize_variant(value)
      return :original if value.nil? || value == "original"
      return :sanitized if value == "sanitized"

      raise Sessions::Errors::InvalidPayload, "Unsupported variant: #{value}"
    end

    def resolve_path(entry, variant:)
      root = repository.resolve_root

      case variant
      when :original
        {
          absolute_path: Pathname.new(entry[:absolute_path]),
          relative_path: entry[:relative_path],
          variant: :original
        }
      when :sanitized
        sanitized_relative = entry[:sanitized_relative_path]
        raise Sessions::Errors::MissingSanitizedVariant, "Sanitized variant is not available" unless sanitized_relative

        absolute = root.join(sanitized_relative)
        raise Sessions::Errors::UnreadableFile, "Sanitized file missing" unless absolute.exist?

        {
          absolute_path: absolute,
          relative_path: sanitized_relative,
          variant: :sanitized
        }
      end
    end

    def detail_attributes(entry, path_info:, messages:, variant_metadata:)
      {
        "session_id" => entry[:session_id],
        "title" => entry[:session_id],
        "relative_path" => path_info[:relative_path],
        "filesize_bytes" => variant_metadata[:filesize_bytes],
        "created_at" => entry[:created_at]&.iso8601,
        "completed_at" => entry[:completed_at]&.iso8601,
        "duration_seconds" => entry[:duration_seconds],
        "message_count" => entry[:message_count],
        "tool_call_count" => entry[:tool_call_count],
        "tool_result_count" => entry[:tool_result_count],
        "reasoning_count" => entry[:reasoning_count],
        "meta_event_count" => entry[:meta_event_count],
        "has_sanitized_variant" => entry[:has_sanitized_variant],
        "source_format" => entry[:source_format],
        "speaker_roles" => entry[:speaker_roles],
        "checksum_sha256" => variant_metadata[:checksum_sha256],
        "signature" => variant_metadata[:signature],
        "messages" => messages
      }
    end

    def detail_meta(entry, path_info:, variant_metadata:)
      {
        "session" => {
          "relative_path" => path_info[:relative_path],
          "signature" => variant_metadata[:signature],
          "raw_session_meta" => entry[:raw_session_meta]
        },
        "links" => {
          "download" => download_link(entry[:session_id])
        }
      }
    end

    def download_link(session_id)
      "/api/sessions/#{session_id}/download"
    end

    def metadata_for(entry, path_info:)
      case path_info[:variant]
      when :sanitized
        pathname = path_info[:absolute_path]
        {
          filesize_bytes: pathname.size,
          checksum_sha256: Digest::SHA256.file(pathname).hexdigest,
          signature: build_signature(pathname)
        }
      else
        {
          filesize_bytes: entry[:filesize_bytes],
          checksum_sha256: entry[:checksum_sha256],
          signature: entry[:signature]
        }
      end
    end

    def build_signature(pathname)
      format(Sessions::Repository::DEFAULT_SIGNATURE_FORMAT, mtime: pathname.mtime.to_i, size: pathname.size)
    end
  end
end

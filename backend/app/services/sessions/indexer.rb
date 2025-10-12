# frozen_string_literal: true

require "json"
require "pathname"
require "time"

module Sessions
  class Indexer
    SCHEMA_VERSION = 1

    def initialize(cache_path: default_cache_path, repository: Sessions::Repository.new)
      @cache_path = Pathname.new(cache_path)
      @repository = repository
    end

    def refresh
      entries, failures = repository.scan(capture_errors: true)
      entries_by_path = entries.each_with_object({}) do |entry, hash|
        hash[entry[:relative_path]] = entry
      end
      cached_entries = load_cache

      added = entries_by_path.keys - cached_entries.keys
      removed = cached_entries.keys - entries_by_path.keys
      updated = entries_by_path.each_with_object([]) do |(path, entry), acc|
        next unless cached_entries.key?(path)
        acc << path if cached_entries[path]["signature"] != entry[:signature]
      end

      persist_cache(entries_by_path)

      {
        sessions: entries.sort_by { |entry| entry[:relative_path] },
        added: added.sort,
        updated: updated.sort,
        removed: removed.sort,
        failed_entries: failures,
        updated_at: Time.now.utc
      }
    end

    private

    attr_reader :cache_path, :repository

    def default_cache_path
      Rails.root.join("tmp", "cache", "sessions_index.json")
    end

    def load_cache
      return {} unless cache_path.exist?

      JSON.parse(cache_path.read).fetch("sessions", {})
    rescue JSON::ParserError
      {}
    end

    def persist_cache(entries_by_path)
      ensure_cache_directory
      payload = {
        schema_version: SCHEMA_VERSION,
        generated_at: Time.now.utc.iso8601,
        sessions: entries_by_path.transform_values do |entry|
          {
            "signature" => entry[:signature]
          }
        end
      }

      cache_path.write(JSON.pretty_generate(payload))
    end

    def ensure_cache_directory
      cache_path.dirname.mkpath unless cache_path.dirname.exist?
    end
  end
end

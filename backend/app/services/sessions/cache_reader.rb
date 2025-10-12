# frozen_string_literal: true

module Sessions
  class CacheReader
    CACHE_KEY = "sessions/index".freeze

    def initialize(indexer: Sessions::Indexer.new, cache: Rails.cache)
      @indexer = indexer
      @cache = cache
    end

    def index
      deep_dup(cache.fetch(CACHE_KEY) { refresh_index })
    end

    def sessions
      index[:sessions]
    end

    def session_by_id(session_id)
      index[:sessions].find { |entry| entry[:session_id] == session_id }
    end

    def refresh!
      deep_dup(refresh_index)
    end

    private

    attr_reader :indexer, :cache

    def refresh_index
      result = indexer.refresh
      cache.write(CACHE_KEY, deep_dup(result))
      result
    end

    def deep_dup(object)
      Marshal.load(Marshal.dump(object))
    end
  end
end

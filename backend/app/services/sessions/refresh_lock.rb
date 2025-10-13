# frozen_string_literal: true

require "securerandom"
require "active_support/core_ext/hash/keys"
require "active_support/core_ext/numeric/time"

module Sessions
  class RefreshLock
    LOCK_KEY = "sessions/refresh_lock".freeze
    DEFAULT_TTL = 10.minutes

    def self.acquire(cache: Rails.cache, ttl: DEFAULT_TTL)
      token = SecureRandom.uuid
      now = Time.current
      initial_state = {
        token: token,
        status: "pending",
        job_id: nil,
        enqueued_at: nil,
        updated_at: now
      }

      stored = cache.write(LOCK_KEY, initial_state, expires_in: ttl, unless_exist: true)
      return unless stored

      new(cache: cache, token: token, ttl: ttl)
    end

    def self.state(cache: Rails.cache)
      raw = cache.read(LOCK_KEY)
      raw&.symbolize_keys
    end

    def self.release_by_job(job_id, cache: Rails.cache)
      return false if job_id.blank?

      state = cache.read(LOCK_KEY)
      return false unless state

      job_key = state[:job_id] || state["job_id"]
      return false unless job_key == job_id

      cache.delete(LOCK_KEY)
    end

    def initialize(cache:, token:, ttl: DEFAULT_TTL)
      @cache = cache
      @token = token
      @ttl = ttl
    end

    def mark_enqueued(job_id:, enqueued_at: Time.current, queue: nil)
      attributes = {
        status: "enqueued",
        job_id: job_id,
        enqueued_at: enqueued_at,
        updated_at: Time.current
      }
      attributes[:queue] = queue if queue

      write_state(**attributes)
    end

    def mark_completed(completed_at: Time.current)
      write_state(
        status: "completed",
        completed_at: completed_at,
        updated_at: Time.current
      )
    end

    def release!
      state = read_state
      return false unless state

      if state[:token] == token
        cache.delete(LOCK_KEY)
      else
        false
      end
    end

    private

    attr_reader :cache, :token, :ttl

    def read_state
      cache.read(LOCK_KEY)&.symbolize_keys
    end

    def write_state(**attributes)
      state = read_state || {}
      return false if state[:token] && state[:token] != token

      cache.write(LOCK_KEY, state.merge(attributes).merge(token: token), expires_in: ttl)
    end
  end
end

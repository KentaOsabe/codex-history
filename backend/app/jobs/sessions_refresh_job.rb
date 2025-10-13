# frozen_string_literal: true

require "json"

class SessionsRefreshJob < ApplicationJob
  queue_as :default

  def perform
    enqueued_at = Time.current
    log_info("start", enqueued_at: enqueued_at)

    started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    result = cache_reader.refresh!
    duration_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started) * 1000).round(3)

    log_info("finish", duration_ms: duration_ms, updated_at: result[:updated_at])

    result
  rescue StandardError => e
    log_error("error", error_class: e.class.name, error_message: e.message)

    raise
  ensure
    Sessions::RefreshLock.release_by_job(job_id)
  end

  private

  def cache_reader
    @cache_reader ||= Sessions::CacheReader.new
  end

  def log_info(event, **payload)
    Rails.logger.info(build_log_message(event, payload))
  end

  def log_error(event, **payload)
    Rails.logger.error(build_log_message(event, payload))
  end

  def build_log_message(event, payload)
    data = { event: event, job_id: job_id }.merge(payload).transform_values do |value|
      value.is_a?(Time) ? value.iso8601 : value
    end
    "[SessionsRefreshJob] #{event} | #{data.to_json}"
  end
end

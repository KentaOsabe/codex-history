# frozen_string_literal: true

module Sessions
  class RefreshLauncher
    Result = Struct.new(:status, :job, :enqueued_at, :lock_state, keyword_init: true)

    def self.call(**options)
      new(**options).call
    end

    def initialize(lock: Sessions::RefreshLock, job_class: SessionsRefreshJob, clock: Time)
      @lock = lock
      @job_class = job_class
      @clock = clock
    end

    def call
      lock_instance = lock.acquire
      return Result.new(status: :conflict, lock_state: lock.state) unless lock_instance

      enqueued_at = current_time
      job = job_class.perform_later
      lock_instance.mark_enqueued(job_id: job.job_id, enqueued_at: enqueued_at, queue: job.queue_name)

      Result.new(status: :accepted, job: job, enqueued_at: enqueued_at)
    rescue StandardError => error
      lock_instance.release! if lock_instance
      raise error
    end

    private

    attr_reader :lock, :job_class, :clock

    def current_time
      clock.respond_to?(:current) ? clock.current : Time.current
    end
  end
end

# frozen_string_literal: true

module Api
  class SessionsController < BaseController
    def index
      params_model = ::Api::Sessions::IndexParams.new(index_params)

      unless params_model.valid?
        return render_invalid_index_params(params_model)
      end

      index_payload = cache_reader.index
      sessions = index_payload[:sessions]

      filtered = apply_filters(sessions, params_model)
      sorted = apply_sort(filtered, params_model)
      pagination = paginate(sorted, params_model)

      data = pagination[:items].map { |entry| serialize_session(entry) }
      meta = build_index_meta(index_payload, params_model, total_count: filtered.size, total_pages: pagination[:total_pages])

      render_success(data: data, meta: meta)
    end

    def refresh
      result = ::Sessions::RefreshLauncher.call
      return render_refresh_in_progress(result.lock_state) if result.status == :conflict

      job = result.job
      enqueued_at = result.enqueued_at

      render_success(
        data: job_payload(job),
        meta: job_meta(job, enqueued_at),
        status: :accepted
      )
    end

    def refresh_status
      job_id = params[:job_id]
      state = ::Sessions::RefreshLock.state

      if state.present? && (state[:job_id] == job_id)
        render_success(data: job_status_payload(state), meta: job_status_meta(state))
      else
        render_error(
          status: :not_found,
          code: "refresh_job_not_found",
          title: "Refresh job not found",
          detail: "Refresh job is not tracked or has expired",
          meta: { job: { id: job_id } }
        )
      end
    end

    def show
      detail = detail_builder.build(session_id: params[:id], variant: params[:variant])

      data = {
        "id" => params[:id],
        "type" => "session",
        "attributes" => detail[:attributes],
        "links" => {
          "self" => request.path
        }
      }

      render_success(data: data, meta: detail[:meta])
    end

    private

    def cache_reader
      @cache_reader ||= ::Sessions::CacheReader.new
    end

    def render_refresh_in_progress(state)
      normalized = normalize_job_state(state || ::Sessions::RefreshLock.state)
      meta = job_status_meta(normalized)

      render_error(
        status: :conflict,
        code: "refresh_in_progress",
        title: "Sessions refresh is already running",
        detail: "A sessions refresh job is already enqueued or running",
        meta: meta
      )
    end

    def job_payload(job)
      {
        "id" => job.job_id,
        "type" => "job",
        "attributes" => {
          "status" => "enqueued"
        }
      }
    end

    def job_meta(job, enqueued_at)
      {
        "job" => {
          "queue" => job.queue_name,
          "enqueued_at" => enqueued_at.iso8601
        }
      }
    end

    def job_status_payload(state)
      normalized = normalize_job_state(state)
      {
        "id" => normalized[:job_id],
        "type" => "job",
        "attributes" => {
          "status" => normalized[:status],
          "queue" => normalized[:queue],
          "enqueued_at" => iso8601(normalized[:enqueued_at]),
          "updated_at" => iso8601(normalized[:updated_at]),
          "completed_at" => iso8601(normalized[:completed_at]),
          "error_message" => normalized[:error_message]
        }.compact
      }
    end

    def job_status_meta(state)
      normalized = normalize_job_state(state)
      {
        "job" => {
          "id" => normalized[:job_id],
          "status" => normalized[:status],
          "queue" => normalized[:queue],
          "enqueued_at" => iso8601(normalized[:enqueued_at]),
          "updated_at" => iso8601(normalized[:updated_at]),
          "completed_at" => iso8601(normalized[:completed_at])
        }.compact
      }
    end

    def normalize_job_state(state)
      (state || {}).transform_keys { |key| key.to_sym rescue key }
    end

    def iso8601(value)
      value.respond_to?(:iso8601) ? value.iso8601 : value
    end

    def detail_builder
      @detail_builder ||= ::Sessions::DetailBuilder.new(cache_reader: cache_reader)
    end

    def render_invalid_index_params(params_model)
      if params_model.errors[:base].any?
        render_error(
          status: :unprocessable_content,
          code: "invalid_period",
          title: "Invalid period",
          detail: params_model.errors[:base].join(", "),
          meta: { invalid_fields: params_model.errors.to_hash(true) }
        )
      else
        render_invalid_parameters(params_model.errors.to_hash(true))
      end
    end

    def index_params
      params.permit(:page, :per_page, :sort, :start_date, :end_date, :speaker, :q)
    end

    def apply_filters(entries, params_model)
      entries.select do |entry|
        within_date_range = within_range?(entry[:created_at], params_model)
        matches_speaker = matches_speaker?(entry[:speaker_roles], params_model.speaker_roles)
        matches_query = matches_query?(entry, params_model.q)

        within_date_range && matches_speaker && matches_query
      end
    end

    def within_range?(time, params_model)
      return true unless params_model.parsed_start_date || params_model.parsed_end_date

      time ||= Time.at(0)
      start_ok = params_model.parsed_start_date.nil? || time >= params_model.parsed_start_date.to_time.beginning_of_day
      end_ok = params_model.parsed_end_date.nil? || time <= params_model.parsed_end_date.to_time.end_of_day

      start_ok && end_ok
    end

    def matches_speaker?(entry_speakers, requested_roles)
      return true if requested_roles.empty?

      entry_speakers ||= []
      (entry_speakers & requested_roles).any?
    end

    def matches_query?(entry, query)
      return true if query.blank?

      lowered = query.downcase
      fields = [
        entry[:session_id],
        entry[:relative_path],
        entry.dig(:raw_session_meta, "payload", "instructions")
      ].compact

      fields.any? { |value| value.to_s.downcase.include?(lowered) }
    end

    def apply_sort(entries, params_model)
      field = params_model.sort_field
      direction = params_model.sort_direction

      sorted = entries.sort_by do |entry|
        value = entry[field.to_sym]
        value = value.to_f if value.is_a?(Numeric)
        value || default_sort_value(field)
      end

      direction == :desc ? sorted.reverse : sorted
    end

    def default_sort_value(field)
      case field
      when "created_at"
        Time.at(0)
      else
        0
      end
    end

    def paginate(entries, params_model)
      per_page = params_model.per_page_count
      page = params_model.page_number
      offset = (page - 1) * per_page
      items = entries.slice(offset, per_page) || []
      total_pages = entries.empty? ? 0 : (entries.size / per_page.to_f).ceil

      {
        items: items,
        total_pages: total_pages
      }
    end

    def serialize_session(entry)
      {
        "id" => entry[:session_id],
        "type" => "session",
        "attributes" => {
          "session_id" => entry[:session_id],
          "title" => entry[:session_id],
          "relative_path" => entry[:relative_path],
          "created_at" => entry[:created_at]&.iso8601,
          "completed_at" => entry[:completed_at]&.iso8601,
          "duration_seconds" => entry[:duration_seconds],
          "filesize_bytes" => entry[:filesize_bytes],
          "message_count" => entry[:message_count],
          "tool_call_count" => entry[:tool_call_count],
          "tool_result_count" => entry[:tool_result_count],
          "reasoning_count" => entry[:reasoning_count],
          "meta_event_count" => entry[:meta_event_count],
          "checksum_sha256" => entry[:checksum_sha256],
          "has_sanitized_variant" => entry[:has_sanitized_variant],
          "source_format" => entry[:source_format],
          "speaker_roles" => entry[:speaker_roles]
        },
        "links" => {
          "self" => "/api/sessions/#{entry[:session_id]}"
        }
      }
    end

    def build_index_meta(index_payload, params_model, total_count:, total_pages:)
      {
        "pagination" => {
          "page" => params_model.page_number,
          "per_page" => params_model.per_page_count,
          "total_count" => total_count,
          "total_pages" => total_pages
        },
        "sort" => params_model.applied_sort,
        "filters" => {
          "start_date" => params_model.start_date.presence,
          "end_date" => params_model.end_date.presence,
          "speaker" => params_model.speaker_roles,
          "q" => params_model.q.presence
        },
        "index" => {
          "updated_at" => index_payload[:updated_at]&.iso8601,
          "added_count" => index_payload[:added].size,
          "updated_count" => index_payload[:updated].size,
          "removed_count" => index_payload[:removed].size,
          "failed_entries_count" => index_payload[:failed_entries].size
        }
      }
    end
  end
end

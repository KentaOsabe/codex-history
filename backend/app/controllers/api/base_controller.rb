# frozen_string_literal: true

module Api
  class BaseController < ApplicationController
    rescue_from StandardError do |error|
      render_error(
        status: :internal_server_error,
        code: "internal_server_error",
        title: "Internal Server Error",
        detail: error.message,
        error: error,
        log_level: :error
      )
    end

    rescue_from ActionController::ParameterMissing do |error|
      render_invalid_parameters(error.param => [ "is required" ])
    end

    rescue_from ::Sessions::Errors::MissingRoot do |error|
      render_error(
        status: :internal_server_error,
        code: "missing_root",
        title: "Sessions root is not configured",
        detail: error.message,
        error: error,
        log_level: :error
      )
    end

    rescue_from ::Sessions::Errors::UnreadableFile do |error|
      render_error(
        status: :not_found,
        code: "session_not_found",
        title: "Session could not be found",
        detail: error.message,
        error: error,
        log_level: :info
      )
    end

    rescue_from ::Sessions::Errors::InvalidPayload do |error|
      render_error(
        status: :unprocessable_content,
        code: "invalid_payload",
        title: "Session payload is invalid",
        detail: error.message,
        error: error,
        log_level: :warn
      )
    end

    rescue_from ::Sessions::Errors::MissingSanitizedVariant do |error|
      render_error(
        status: :unprocessable_content,
        code: "sanitized_variant_not_found",
        title: "Sanitized variant is not available",
        detail: error.message,
        error: error,
        log_level: :info
      )
    end

    private

    def render_success(data:, meta: {}, status: :ok)
      render json: {
        data: data,
        meta: meta,
        errors: []
      }, status: status
    end

    def render_invalid_parameters(invalid_fields)
      render_error(
        status: :bad_request,
        code: "invalid_parameters",
        title: "Parameters are invalid",
        detail: "One or more parameters are invalid",
        meta: { invalid_fields: invalid_fields },
        log_level: :info
      )
    end

    def render_error(status:, code:, title:, detail:, meta: {}, error: nil, log_level: nil)
      payload_meta = meta.is_a?(Hash) ? meta : {}
      log_exception(status: status, code: code, detail: detail, meta: payload_meta, error: error, level: log_level)

      render json: {
        data: nil,
        errors: [
          {
            "code" => code,
            "status" => Rack::Utils.status_code(status).to_s,
            "title" => title,
            "detail" => detail,
            "meta" => payload_meta
          }
        ]
      }, status: status
    end

    def log_exception(status:, code:, detail:, meta:, error:, level:)
      logger = Rails.logger
      return unless logger

      level ||= default_log_level(status)
      message = "[API] code=#{code} status=#{Rack::Utils.status_code(status)} detail=#{detail}"
      message = "#{message} error=#{error.class}: #{error.message}" if error
      message = "#{message} meta=#{meta}" if meta.any?

      logger.public_send(level, message)
      return unless error&.backtrace && level == :error

      logger.debug(error.backtrace.join("\n"))
    end

    def default_log_level(status)
      status_code = Rack::Utils.status_code(status)

      if status_code >= 500
        :error
      elsif status_code >= 400
        :info
      else
        :info
      end
    end
  end
end

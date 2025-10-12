# frozen_string_literal: true

module Api
  class BaseController < ApplicationController
    rescue_from ActionController::ParameterMissing do |error|
      render_invalid_parameters(error.param => ["is required"])
    end

    rescue_from ::Sessions::Errors::MissingRoot do |error|
      render_error(
        status: :internal_server_error,
        code: "missing_root",
        title: "Sessions root is not configured",
        detail: error.message
      )
    end

    rescue_from ::Sessions::Errors::UnreadableFile do |error|
      render_error(
        status: :not_found,
        code: "session_not_found",
        title: "Session could not be found",
        detail: error.message
      )
    end

    rescue_from ::Sessions::Errors::InvalidPayload do |error|
      render_error(
        status: :unprocessable_entity,
        code: "invalid_payload",
        title: "Session payload is invalid",
        detail: error.message
      )
    end

    rescue_from ::Sessions::Errors::MissingSanitizedVariant do |error|
      render_error(
        status: :unprocessable_entity,
        code: "sanitized_variant_not_found",
        title: "Sanitized variant is not available",
        detail: error.message
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
        meta: { invalid_fields: invalid_fields }
      )
    end

    def render_error(status:, code:, title:, detail:, meta: {})
      render json: {
        data: nil,
        meta: meta.is_a?(Hash) ? meta : {},
        errors: [
          {
            code: code,
            status: Rack::Utils.status_code(status),
            title: title,
            detail: detail,
            meta: meta
          }
        ]
      }, status: status
    end
  end
end

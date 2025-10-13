# frozen_string_literal: true

module Api
  class SearchesController < BaseController
    def index
      params_model = ::Api::Searches::IndexParams.new(search_params)

      unless params_model.valid?
        return render_invalid_parameters(params_model.errors.to_hash(true))
      end

      result = keyword_searcher.search(
        keyword: params_model.keyword,
        scope: params_model.scope,
        page: params_model.page_number,
        limit: params_model.limit_count
      )

      data = result[:items].map { |item| serialize_result(item) }
      meta = build_meta(result, params_model)

      render_success(data: data, meta: meta)
    end

    private

    def search_params
      params.permit(:keyword, :scope, :page, :limit)
    end

    def keyword_searcher
      @keyword_searcher ||= ::Search::KeywordSearcher.new
    end

    def serialize_result(item)
      {
        "id" => item[:result_id],
        "type" => "search_result",
        "attributes" => {
          "session_id" => item[:session_id],
          "scope" => item[:scope],
          "highlight" => item[:highlight],
          "occurred_at" => item[:occurred_at]&.iso8601,
          "message_role" => item[:message_role],
          "message_id" => item[:message_id],
          "relative_path" => item[:relative_path],
          "occurrence_index" => item[:occurrence_index]
        },
        "links" => {
          "session" => "/api/sessions/#{item[:session_id]}"
        }
      }
    end

    def build_meta(result, params_model)
      meta = {
        "pagination" => {
          "page" => params_model.page_number,
          "limit" => params_model.limit_count,
          "total_count" => result[:total_count],
          "total_pages" => result[:total_pages]
        },
        "filters" => {
          "keyword" => params_model.keyword,
          "scope" => params_model.scope
        }
      }

      if result[:duration_ms]
        meta["timing"] = {
          "duration_ms" => result[:duration_ms]
        }
      end

      meta
    end
  end
end

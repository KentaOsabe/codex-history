# frozen_string_literal: true

module Api
  module Searches
    class IndexParams
      include ActiveModel::Model
      include ActiveModel::Attributes

      DEFAULT_SCOPE = "chat_messages"
      VALID_SCOPES = [ DEFAULT_SCOPE ].freeze
      DEFAULT_LIMIT = 10
      MAX_LIMIT = 50

      attribute :keyword, :string
      attribute :scope, :string, default: DEFAULT_SCOPE
      attribute :page, :integer, default: 1
      attribute :limit, :integer, default: DEFAULT_LIMIT

      validates :page, numericality: { greater_than_or_equal_to: 1 }
      validates :limit, numericality: { greater_than_or_equal_to: 1, less_than_or_equal_to: MAX_LIMIT }
      validate :validate_keyword
      validate :validate_scope

      def keyword
        return @keyword if defined?(@keyword)

        value = super
        sanitized = value.is_a?(String) ? value.strip : nil
        @keyword = sanitized.presence
      end

      def scope
        return @scope if defined?(@scope)

        value = super
        normalized = value.to_s.strip
        normalized = DEFAULT_SCOPE if normalized.empty?
        @scope = normalized.downcase
      end

      def page_number
        (page || 1)
      end

      def limit_count
        (limit || DEFAULT_LIMIT)
      end

      private

      def validate_keyword
        errors.add(:keyword, "is required") if keyword.nil? || keyword.empty?
      end

      def validate_scope
        errors.add(:scope, "is not included in the list") unless VALID_SCOPES.include?(scope)
      end
    end
  end
end

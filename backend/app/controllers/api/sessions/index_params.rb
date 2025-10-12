# frozen_string_literal: true

module Api
  module Sessions
    class IndexParams
      include ActiveModel::Model
      include ActiveModel::Attributes

      SORTABLE_FIELDS = %w[
        created_at
        message_count
        duration_seconds
      ].freeze

      VALID_SPEAKERS = %w[user assistant tool system].freeze

      attribute :page, :integer, default: 1
      attribute :per_page, :integer, default: 25
      attribute :sort, :string, default: "-created_at"
      attribute :start_date, :string
      attribute :end_date, :string
      attribute :speaker, :string
      attribute :q, :string

      validates :page, numericality: { greater_than_or_equal_to: 1 }
      validates :per_page, numericality: { greater_than_or_equal_to: 1, less_than_or_equal_to: 100 }
      validate :validate_sort
      validate :validate_dates
      validate :validate_speaker
      validate :validate_query

      def applied_sort
        sort.presence || "-created_at"
      end

      def sort_field
        value = applied_sort
        value.delete_prefix("-")
      end

      def sort_direction
        applied_sort.start_with?("-") ? :desc : :asc
      end

      def page_number
        (page || 1)
      end

      def per_page_count
        (per_page || 25)
      end

      def speaker_roles
        return [] if speaker.blank?

        @speaker_roles ||= speaker.split(",").map { |role| role.strip.downcase }.reject(&:blank?).uniq
      end

      def parsed_start_date
        @parsed_start_date
      end

      def parsed_end_date
        @parsed_end_date
      end

      private

      def validate_sort
        field = sort_field
        return if SORTABLE_FIELDS.include?(field)

        errors.add(:sort, "is not supported")
      end

      def validate_dates
        @parsed_start_date = parse_date(:start_date, start_date)
        @parsed_end_date = parse_date(:end_date, end_date)

        return unless parsed_start_date && parsed_end_date
        return unless parsed_start_date > parsed_end_date

        errors.add(:base, "start_date must be earlier than or equal to end_date")
        errors.add(:start_date, "must be earlier than or equal to end_date")
      end

      def parse_date(field, value)
        return nil if value.blank?

        Date.iso8601(value)
      rescue ArgumentError
        errors.add(field, "is not a valid ISO8601 date")
        nil
      end

      def validate_speaker
        invalid = speaker_roles - VALID_SPEAKERS
        return if invalid.empty?

        errors.add(:speaker, "contains unsupported roles: #{invalid.join(", ")}")
      end

      def validate_query
        return if q.nil?
        return if q.is_a?(String) && q.strip.length >= 1

        errors.add(:q, "must be a non-empty string")
      end
    end
  end
end

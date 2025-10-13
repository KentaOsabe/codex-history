# frozen_string_literal: true

require "uri"
require "rails/html/sanitizer"

module Sanitizers
  class HtmlMessageSanitizer
    SAFE_LIST_TAGS = %w[br p ul ol li strong em b i code pre blockquote a span].freeze
    SAFE_LIST_ATTRIBUTES = {
      "a" => %w[href title rel target],
      "code" => %w[class]
    }.freeze
    SAFE_PROTOCOLS = %w[http https mailto].freeze

    class << self
      def call(text)
        return "" if text.nil?

        sanitized = sanitizer.sanitize(
          text.to_s,
          tags: SAFE_LIST_TAGS,
          attributes: SAFE_LIST_ATTRIBUTES
        )

        strip_disallowed_protocols(sanitized)
      end

      private

      def sanitizer
        @sanitizer ||= Rails::Html::SafeListSanitizer.new
      end

      def strip_disallowed_protocols(html)
        fragment = Loofah.fragment(html)

        fragment.css("a").each do |node|
          href = node["href"].to_s
          next if href.empty?

          begin
            uri = URI.parse(href)
          rescue URI::InvalidURIError
            node.remove_attribute("href")
            next
          end

          scheme = uri&.scheme&.downcase
          node.remove_attribute("href") if scheme.present? && !SAFE_PROTOCOLS.include?(scheme)
        end

        fragment.to_s
      end
    end
  end
end

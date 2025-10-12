# frozen_string_literal: true

module Sessions
  module Errors
    class MissingRoot < StandardError; end
    class UnreadableFile < StandardError; end
    class InvalidPayload < StandardError; end
    class MissingSanitizedVariant < StandardError; end
  end
end

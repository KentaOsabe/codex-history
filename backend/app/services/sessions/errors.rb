# frozen_string_literal: true

module Sessions
  module Errors
    class MissingRoot < StandardError; end
    class UnreadableFile < StandardError; end
    class InvalidPayload < StandardError; end
  end
end

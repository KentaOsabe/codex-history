# frozen_string_literal: true

module SearchFixtureHelper
  def search_fixture_root
    Rails.root.join("spec/fixtures/sessions/search")
  end

  def search_fixture_path(*parts)
    search_fixture_root.join(*parts)
  end
end

RSpec.configure do |config|
  config.include SearchFixtureHelper
end

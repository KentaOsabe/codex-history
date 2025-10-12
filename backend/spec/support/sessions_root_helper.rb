# frozen_string_literal: true

require "tmpdir"
require "fileutils"
require "pathname"

module SessionsRootHelper
  def with_sessions_root(fixture: "source")
    source = Rails.root.join("spec/fixtures/sessions", fixture)
    raise "Unknown sessions fixture: #{fixture}" unless source.exist?

    Dir.mktmpdir("sessions-root") do |dir|
      FileUtils.copy_entry(source.to_s, dir)
      previous_root = ENV["CODEX_SESSIONS_ROOT"]
      ENV["CODEX_SESSIONS_ROOT"] = dir
      begin
        yield Pathname.new(dir)
      ensure
        ENV["CODEX_SESSIONS_ROOT"] = previous_root
      end
    end
  end
end

RSpec.configure do |config|
  config.include SessionsRootHelper
end

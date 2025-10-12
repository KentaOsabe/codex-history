# frozen_string_literal: true

require "rails_helper"

RSpec.describe Sessions::Errors do
  # 目的: 例外クラス定義が存在し、サービス層が要件どおり分類可能であることを保証する。
  it "MissingRoot / UnreadableFile / InvalidPayload を提供する" do
    expect(described_class::MissingRoot).to be < StandardError
    expect(described_class::UnreadableFile).to be < StandardError
    expect(described_class::InvalidPayload).to be < StandardError
  end
end

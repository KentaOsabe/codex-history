# frozen_string_literal: true

require "rails_helper"
require "ostruct"

RSpec.describe "FactoryBot 設定" do
  before do
    FactoryBot.define do
      factory :synthetic_sample, class: OpenStruct do
        transient do
          message { "default" }
        end

        initialize_with { new(message: message) }
      end
    end
  end

  after do
    FactoryBot.factories.clear
    FactoryBot.rewind_sequences
  end

  # 目的: FactoryBot の省略記法が利用できることを保証する
  it "FactoryBot の build シンタックスが利用できる" do
    sample = build(:synthetic_sample, message: "configured")

    expect(sample.message).to eq("configured")
  end
end

# frozen_string_literal: true

require "rails_helper"

RSpec.describe SessionsRefreshJob do
  include ActiveJob::TestHelper

  before do
    ActiveJob::Base.queue_adapter = :test
    clear_enqueued_jobs
    clear_performed_jobs
  end

  describe ".perform_later" do
    # 目的: ジョブが非同期キューに投入されることと、キュー名が期待通りであることを保証する。
    it "セッション再インデックスのジョブを default キューに投入する" do
      expect { described_class.perform_later }
        .to have_enqueued_job(described_class).on_queue("default")
    end
  end

  describe "#perform" do
    # 目的: 再インデックス処理が実際に実行され、進捗ログが出力されることを保証する。
    it "Sessions::CacheReader#refresh! を実行し開始・終了ログを出力する" do
      cache_reader = instance_double(Sessions::CacheReader, refresh!: { updated_at: Time.current })
      allow(Sessions::CacheReader).to receive(:new).and_return(cache_reader)
      logger = instance_double(ActiveSupport::Logger)
      allow(logger).to receive(:info)
      allow(logger).to receive(:error)
      allow(Rails).to receive(:logger).and_return(logger)
      allow(Sessions::RefreshLock).to receive(:release_by_job)

      perform_enqueued_jobs { described_class.perform_later }

      expect(cache_reader).to have_received(:refresh!).once
      expect(logger).to have_received(:info).with(include("[SessionsRefreshJob] start"))
      expect(logger).to have_received(:info).with(include("[SessionsRefreshJob] finish"))
      expect(logger).not_to have_received(:error)
      expect(Sessions::RefreshLock).to have_received(:release_by_job).with(kind_of(String))
    end

    # 目的: 再インデックス中に例外が発生した場合でもエラーログを記録し、例外を再送出することを保証する。
    it "例外発生時にエラーログを出力し例外を再送出する" do
      cache_reader = instance_double(Sessions::CacheReader)
      allow(cache_reader).to receive(:refresh!).and_raise(StandardError, "refresh failed")
      allow(Sessions::CacheReader).to receive(:new).and_return(cache_reader)
      logger = instance_double(ActiveSupport::Logger)
      allow(logger).to receive(:info)
      allow(logger).to receive(:error)
      allow(Rails).to receive(:logger).and_return(logger)
      allow(Sessions::RefreshLock).to receive(:release_by_job)

      expect do
        perform_enqueued_jobs { described_class.perform_later }
      end.to raise_error(Minitest::UnexpectedError) do |error|
        expect(error.cause).to be_a(StandardError)
        expect(error.cause.message).to eq("refresh failed")
      end

      expect(logger).to have_received(:info).with(include("[SessionsRefreshJob] start"))
      expect(logger).to have_received(:error).with(include("[SessionsRefreshJob] error"))
      expect(Sessions::RefreshLock).to have_received(:release_by_job).with(kind_of(String))
    end
  end
end

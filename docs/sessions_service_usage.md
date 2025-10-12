# セッションサービス利用ガイド

最終更新: 2025-10-12

## 1. 主要クラスの責務

| クラス | 役割 | 主なメソッド |
| --- | --- | --- |
| `Sessions::StreamReader` | JSONL をストリーミングして統計情報を算出 | `summary_for(path)`, `each_event(path, &block)` |
| `Sessions::Repository` | ディレクトリを再帰走査し、セッションメタデータを組み立て | `scan(capture_errors: false)`, `resolve_root` |
| `Sessions::Indexer` | キャッシュを読み込みつつ差分検出し、セッション一覧を更新 | `refresh` |
| `Sessions::Errors` | 例外クラスを集約（ルート未設定・ファイル読み取り失敗・JSON不正） | `MissingRoot`, `UnreadableFile`, `InvalidPayload` |

## 2. 簡易的な利用フロー

```ruby
repository = Sessions::Repository.new
indexer = Sessions::Indexer.new(repository: repository)

result = indexer.refresh
# => {
#      sessions: [...],
#      added: ["2025-01-01/session-alpha.jsonl"],
#      updated: [],
#      removed: [],
#      failed_entries: [],
#      updated_at: 2025-10-12 01:23:45 UTC
#    }
```

- Web/API レイヤーは `result[:sessions]` をもとに一覧レスポンスを組み立てる。
- `failed_entries` は UI やログでユーザーに通知し、問題のあるファイルをスキップしつつ処理を継続。

## 3. テストでの扱い

- `spec/support/sessions_root_helper.rb` の `with_sessions_root(fixture: "source")` を利用して、フィクスチャを一時ディレクトリにコピーした状態でテストを実行する。
- 破損ファイルの検証には `fixture: "corrupted"` を利用。
- RSpec 実行例:

```bash
docker compose run --rm backend bundle exec rspec spec/services/sessions
```

## 4. よくあるエラー

| エラー | 説明 | 対応策 |
| --- | --- | --- |
| `Sessions::Errors::MissingRoot` | `CODEX_SESSIONS_ROOT` が未設定、またはディレクトリが存在しない | 環境変数を設定する / ディレクトリを作成する |
| `Sessions::Errors::UnreadableFile` | JSONL ファイルが存在しない、または読み取り不可 | ファイルの権限やパスを確認する |
| `Sessions::Errors::InvalidPayload` | JSON パースに失敗。メッセージに行番号が含まれる | 該当ファイルを修復またはサニタイズする |

## 5. 参考ドキュメント

- `docs/sessions_cache.md`: 差分検出・キャッシュフローの詳細
- `docs/dummy_jsonl_generation.md`: サンプルデータ生成の手順
- `docs/normalized_message.md`: 正規化済みメッセージスキーマ

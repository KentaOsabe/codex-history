# ダミー JSONL 生成方針

最終更新: 2025-10-11

## 目的

GitHub 公開リポジトリにコミット可能な形で Codex 会話ログのサンプルデータを用意し、プッシュプロテクションや秘匿情報ポリシーに抵触せずにテストやデモを実行できるようにする。

## 基本方針

1. **テンプレート駆動生成**: 実ログに依存せず、`NormalizedMessage` スキーマに準拠した最小ケース（ユーザー発話 / アシスタント応答 / ツール呼び出し）をテンプレート JSONL として用意する。
2. **サニタイズ変換**: 実ログを参考にする場合でも、平文のプロンプト・応答・画像 Base64 などを直接残さず、ハッシュ化またはダミー文字列に置換する。
3. **メタイベントの保持**: `token_count` や `function_call` など構造確認に必要なイベントは疑似値へ置換した上で残す。

## 推奨ディレクトリ構成

```
fixtures/
  dummy_sessions/
    2025-01-01/
      session-0001.jsonl
```

テストコードやドキュメントからは `fixtures/dummy_sessions` を参照し、本番データディレクトリ(`~/.codex/sessions`)と混在させない。

## 生成レシピ

### 1. テンプレートから生成

1. `fixtures/templates/normalized_message.json` に `NormalizedMessage` の代表例を JSON 配列で記述する（デフォルトはすでに登録済み）。
2. 下記コマンドを実行すると、テンプレートの `raw.event_type` / `raw.payload` をもとに JSONL を書き出す。

```bash
python scripts/generate_dummy_jsonl.py \
  --template fixtures/templates/normalized_message.json \
  --output fixtures/dummy_sessions/2025-01-01/session-0001.jsonl
```

引数を省略すると上記パスを既定値として使用する。テンプレート内で `raw.payload` が `null` の場合は空オブジェクトを出力しない。

### 2. 実ログのサニタイズ

1. 対象ファイルを `python scripts/sanitize_session.py <input.jsonl> <output.jsonl>` の形式で変換。
2. 変換ルール例:
   - `payload.content[].text` は `"<dummy-text-1>"` のようなダミーに差し替え。
   - `encrypted_content` は SHA-256 ハッシュのみ保持。
   - `image_url` の `data:image/...` は削除し、`media": {"data_uri": "data:image/png;base64,<redacted>"}` を記録。
   - `arguments` / `output` は構造を保ったまま値をダミー値へ置換（例: `"command": ["echo", "<placeholder>"]`）。
3. 変換後のファイルは既存の `generate_dummy_jsonl.py` と同様に JSONL 形式で保存される。

```bash
python scripts/sanitize_session.py \
  /path/to/original.jsonl \
  fixtures/dummy_sessions/2025-01-01/session-0001-sanitized.jsonl
```

## 品質チェック

- **静的検査**: `python -m json.tool` で JSON 形式を検証。
- **スキーマ検証**: `NormalizedMessage` へ正規化するユニットテストを追加し、ダミーデータで既存機能が動作するか確認。
- **秘密情報スキャン**: GitHub Push Protection オフラインルールや `trufflehog` を用いて機密情報が含まれないことを保証。

## 今後の TODO

- テンプレートに追加シナリオ（ツール失敗、画像レスポンスなど）を拡充する。
- 生成スクリプトを make タスクや CLI から呼び出せるラッパーを整備する。
- サニタイズルールをオプション化し、保持したいフィールドを選択できるようにする。

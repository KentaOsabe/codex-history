# AGENTS.md

## Conversation Guidelines

- 常に日本語で会話する
- コミットメッセージおよびPR（タイトル・説明）は日本語で記載する

## Development Methodology

### Test-Driven Development (TDD)

**CRITICAL**: 新機能やコンポーネントを追加する際は必ずTDD手法に従うこと。

#### TDD実装手順
1. **Red**: まずテストを書き、失敗することを確認
2. **Green**: テストが通る最小限の実装を行う
3. **Refactor**: コードを改善し、テストが通ることを確認
4. **Repeat**: 機能が完成するまで繰り返す

## Git Workflow

- 基本的に `development` ブランチ上で直接作業し、個別ブランチは作成しない。

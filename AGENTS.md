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

#### テストケース設計原則

**CRITICAL**: TDD実装において、テストケースは以下の原則に従って設計すること：

- **要件ベース**: GitHub Issueや仕様書の要件に基づいてテストケースを作成
- **最小限の機能担保**: 複雑すぎず、要件を満たす必要最小限の機能を担保する
- **実装詳細に非依存**: UIの詳細な実装方法ではなく、ユーザーの期待動作を検証
- **明確な目的と概要をコメントとして記載**: 各テストケースが何の目的で、何を保証するのかを明確に記載する

### 開発完了時の確認事項

リリース前に以下のチェックを必ず実施し、すべて成功した状態で完了とすること。

- `docker compose run --rm backend bundle exec rspec` などで単体テストが全て **PASS** すること
- `docker compose run --rm backend bundle exec rubocop` で RuboCop の Lint エラーがないこと
- `docker compose run --rm backend bin/brakeman --no-pager` で Brakeman のセキュリティ警告が出ないこと

## Git Workflow

- 基本的に `development` ブランチ上で直接作業し、個別ブランチは作成しない。


# AI-DLC and Spec-Driven Development

Kiro-style Spec Driven Development implementation on AI-DLC (AI Development Life Cycle)

## Project Memory
Project memory keeps persistent guidance (steering, specs notes, component docs) so Codex honors your standards each run. Treat it as the long-lived source of truth for patterns, conventions, and decisions.

- Use `.kiro/steering/` for project-wide policies: architecture principles, naming schemes, security constraints, tech stack decisions, api standards, etc.
- Use local `AGENTS.md` files for feature or library context (e.g. `src/lib/payments/AGENTS.md`): describe domain assumptions, API contracts, or testing conventions specific to that folder. Codex auto-loads these when working in the matching path.
- Specs notes stay with each spec (under `.kiro/specs/`) to guide specification-level workflows.

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- Check `.kiro/specs/` for active specifications
- Use `/prompts:kiro-spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, generate responses in English

## Minimal Workflow
- Phase 0 (optional): `/prompts:kiro-steering`, `/prompts:kiro-steering-custom`
- Phase 1 (Specification):
  - `/prompts:kiro-spec-init "description"`
  - `/prompts:kiro-spec-requirements {feature}`
  - `/prompts:kiro-validate-gap {feature}` (optional: for existing codebase)
  - `/prompts:kiro-spec-design {feature} [-y]`
  - `/prompts:kiro-validate-design {feature}` (optional: design review)
  - `/prompts:kiro-spec-tasks {feature} [-y]`
- Phase 2 (Implementation): `/prompts:kiro-spec-impl {feature} [tasks]`
  - `/prompts:kiro-validate-impl {feature}` (optional: after implementation)
- Progress check: `/prompts:kiro-spec-status {feature}` (use anytime)

## Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/prompts:kiro-spec-status`

## Steering Configuration
- Load entire `.kiro/steering/` as project memory
- Default files: `product.md`, `tech.md`, `structure.md`
- Custom files are supported (managed via `/prompts:kiro-steering-custom`)

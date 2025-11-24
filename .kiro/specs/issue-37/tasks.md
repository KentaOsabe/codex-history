# Implementation Plan

- [ ] 1. VM 変換で My request を本文へ昇格し IDE コンテキストを外す
  - `mapResponseToViewModel` で user メッセージに含まれる「My request for Codex」を本文 segments 先頭へ移し、`metadata.ideContext.sections` から除外する。
  - オプション項目データ（既存のオプション値/ラベル）を保持するが、IDE コンテキスト preference とは切り離す。
  - _Requirements: 1.1, 2.1_

- [ ] 2. ユーザーカード UI を本文＋オプションのシンプル構成に改修
  - `MessageCard` の user 分岐で IDE コンテキスト UI をレンダリングしないよう条件分岐し、「本文」→「オプション」順に表示。
  - オプションのチェック状態は初期 OFF（unchecked）でレンダリングし、オプション未存在時はセクション自体を非表示にする。
  - _Requirements: 1.3, 2.2, 2.3_

- [ ] 3. ユーザー本文のタイポをアシスタントと統一
  - `MessageCard.module.css` を調整し、ユーザー本文のフォントサイズ・行間・余白をアシスタントと同等クラスに統一する。
  - 回帰しないよう DOM/CSS snapshot テストを追加または既存テストを更新。
  - _Requirements: 1.2_

- [ ] 4. レイアウト比を 7:3 に変更しモバイル挙動を維持
  - `SessionDetailPage` で `ResponsiveGrid` の `splitRatio` をおおむね [7,3] に変更し、`minSidebarWidth` の影響で右が左を上回らないことを確認。
  - columns=1（モバイル）ではメッセージ領域が先に全幅表示される既存順序を維持する。
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 5. テストと Storybook/Visual 回帰を更新
  - `mapResponseToViewModel.test.tsx`, `MessageCard.ideContext.test.tsx`, `SessionDetailPage.integration.test.tsx` などを追加/更新し、本文位置、フォント統一、オプション初期OFF、レイアウト比、モバイル挙動を検証。
  - 必要に応じて Storybook の該当シナリオで 7:3 比率とメニュー非表示を確認し、Playwright/visual テストを更新。
  - _Requirements: 1.1, 1.2, 1.3, 2.2, 2.3, 3.1-3.3_

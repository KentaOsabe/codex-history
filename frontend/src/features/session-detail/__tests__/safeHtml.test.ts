import { describe, expect, it } from 'vitest'

import { safeHtml } from '../safeHtml'

describe('safeHtml', () => {
  it('script タグを除去して安全なコンテンツのみ残す (R4)', () => {
    // Purpose: Ensure Requirement 4.1 removes <script> nodes entirely and raises the removed flag.
    const input = '<script>alert(1)</script><span>safe</span>'

    const result = safeHtml(input)

    expect(result.html).toBe('<span>safe</span>')
    expect(result.removed).toBe(true)
  })

  it('onload/onclick などの危険な属性を削除する (R4)', () => {
    // Purpose: Validate Requirement 4.1 by stripping event handler attributes while preserving allowed elements.
    const input = '<span onclick="alert(1)" data-id="1">click</span>'

    const result = safeHtml(input)

    expect(result.html).toBe('<span>click</span>')
    expect(result.removed).toBe(true)
  })

  it('javascript: スキームの href を about:blank へ差し替える (R4)', () => {
    // Purpose: Ensure Requirement 4.1 enforces safe href schemes and neutralizes javascript: URIs.
    const input = '<a href="javascript:alert(1)">danger</a>'

    const result = safeHtml(input)

    expect(result.html).toBe('<a href="about:blank" rel="noreferrer noopener">danger</a>')
    expect(result.removed).toBe(true)
  })
})

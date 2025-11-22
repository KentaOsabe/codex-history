import type { RenderedSegment } from './types'

export interface IdeContextSectionModel {
  heading: string
  content: string
  defaultExpanded: boolean
}

export const AGENTS_HEADING_KEY = 'agents-md'

const ROOT_HEADING_PATTERN = /^#\s+context from my ide setup(?:[:：])?.*$/im
const SECTION_HEADING_PATTERN = /^##\s+(.+)$/gim
const IDE_CONTEXT_ANCHOR_PATTERN = /(^|\r?\n)\s*#\s+context from my ide setup(?:[:：])?/i
const DEFAULT_EXPANDED_HEADING = 'my-request-for-codex'
const AGENTS_INSTRUCTIONS_PATTERN = /<INSTRUCTIONS>[\s\S]*?<\/INSTRUCTIONS>/gi
const AGENTS_HEADING_LINE_PATTERN = /^#+\s*agents\.md.*$/gim
const ENVIRONMENT_CONTEXT_BLOCK_PATTERN = /<environment_context[\s\S]*?>[\s\S]*?<\/environment_context>/gi

export const normalizeIdeContextHeading = (heading: string): string => {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const sanitizeContent = (value: string): string => {
  return value.replace(/\s+$/g, '').trim()
}

export const stripEnvironmentContextContent = (text: string): { sanitized: string; removed: boolean } => {
  if (!text) {
    return { sanitized: '', removed: false }
  }

  let removed = false
  const sanitized = text.replace(ENVIRONMENT_CONTEXT_BLOCK_PATTERN, () => {
    removed = true
    return ''
  })

  return { sanitized: sanitized.trim(), removed }
}

export const stripAgentsMdContent = (text: string): { sanitized: string; removed: boolean } => {
  if (!text) {
    return { sanitized: '', removed: false }
  }

  let sanitized = text
  let removed = false

  const replaceAndTrack = (pattern: RegExp, replacement = '') => {
    const next = sanitized.replace(pattern, () => {
      removed = true
      return replacement
    })
    sanitized = next
  }

  replaceAndTrack(AGENTS_INSTRUCTIONS_PATTERN)
  replaceAndTrack(AGENTS_HEADING_LINE_PATTERN)
  replaceAndTrack(/^<INSTRUCTIONS>\s*$\n?/gim)
  replaceAndTrack(/^<\/INSTRUCTIONS>\s*$\n?/gim)

  return { sanitized: sanitized.trim(), removed }
}

export const stripAgentsMdFromSegments = (segments: RenderedSegment[]): { sanitizedSegments: RenderedSegment[] } => {
  let mutated = false
  const sanitizedSegments: RenderedSegment[] = []

  segments.forEach((segment) => {
    const text = segment.text ?? ''
    const { sanitized, removed } = stripAgentsMdContent(text)
    const nextText = sanitized.trim()
    if (removed) {
      mutated = true
    }

    if (nextText.length > 0) {
      sanitizedSegments.push({ ...segment, text: nextText })
      return
    }

    if (!removed && text.length > 0) {
      sanitizedSegments.push({ ...segment, text })
    }
  })

  return { sanitizedSegments: mutated ? sanitizedSegments : segments.map((segment) => ({ ...segment })) }
}

export const stripEnvironmentContextFromSegments = (
  segments: RenderedSegment[],
): { sanitizedSegments: RenderedSegment[] } => {
  let mutated = false
  const sanitizedSegments: RenderedSegment[] = []

  segments.forEach((segment) => {
    const text = segment.text ?? ''
    const { sanitized, removed } = stripEnvironmentContextContent(text)
    const nextText = sanitized.trim()
    if (removed) {
      mutated = true
    }

    if (nextText.length > 0) {
      sanitizedSegments.push({ ...segment, text: nextText })
      return
    }

    if (!removed && text.length > 0) {
      sanitizedSegments.push({ ...segment, text })
    }
  })

  return { sanitizedSegments: mutated ? sanitizedSegments : segments.map((segment) => ({ ...segment })) }
}

export const parseIdeContextSections = (text: string | undefined): IdeContextSectionModel[] => {
  if (!text) {
    return []
  }

  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) {
    return []
  }

  const rootMatch = ROOT_HEADING_PATTERN.exec(normalized)
  if (!rootMatch || typeof rootMatch.index !== 'number') {
    return []
  }

  const contextSlice = normalized
    .slice(rootMatch.index + rootMatch[0].length)
    .replace(/^\s+/, '')
  const stripped = stripAgentsMdContent(contextSlice).sanitized
  const matches: RegExpExecArray[] = []
  let headingMatch: RegExpExecArray | null
   
  while ((headingMatch = SECTION_HEADING_PATTERN.exec(stripped)) !== null) {
    matches.push(headingMatch)
  }
  if (!matches.length) {
    return []
  }

  const sections: IdeContextSectionModel[] = []

    matches.forEach((match, index) => {
    const headingLine = (match[1] ?? '').trim()
    if (!headingLine) {
      return
    }

    const colonIndex = headingLine.indexOf(':')
    const heading = colonIndex >= 0 ? headingLine.slice(0, colonIndex).trim() : headingLine
    const inlineValue = colonIndex >= 0 ? headingLine.slice(colonIndex + 1).trim() : ''
    if (!heading) {
      return
    }

    const key = normalizeIdeContextHeading(heading)
    if (key === AGENTS_HEADING_KEY) {
      return
    }

    const startOffset = (match.index ?? 0) + match[0].length
    const endOffset = index + 1 < matches.length ? matches[index + 1].index ?? stripped.length : stripped.length
    const body = stripped.slice(startOffset, endOffset)
    const contentParts = [inlineValue, body]
      .map((part) => part.trim())
      .filter((part) => part.length > 0)

    if (!contentParts.length) {
      contentParts.push('')
    }

    const content = sanitizeContent(contentParts.join('\n'))

    sections.push({
      heading,
      content,
      defaultExpanded: key === DEFAULT_EXPANDED_HEADING,
    })
  })

  return sections
}

export interface IdeContextExtractionResult {
  sections: IdeContextSectionModel[]
  sanitizedSegments: RenderedSegment[]
}

export const extractIdeContextFromSegments = (
  segments: RenderedSegment[],
): IdeContextExtractionResult | null => {
  const envSanitized = stripEnvironmentContextFromSegments(segments).sanitizedSegments
  const sanitizedSource = stripAgentsMdFromSegments(envSanitized).sanitizedSegments

  if (!sanitizedSource.length) {
    return null
  }

  for (let index = 0; index < sanitizedSource.length; index += 1) {
    const segment = sanitizedSource[index]
    const text = segment.text ?? ''
    if (!text) {
      continue
    }

    const match = IDE_CONTEXT_ANCHOR_PATTERN.exec(text)
    if (!match) {
      continue
    }

    const matchIndex = match.index ?? 0
    const headingStart = matchIndex + (match[1]?.length ?? 0)
    const contextParts: string[] = []
    const firstPart = text.slice(headingStart)
    if (firstPart.length) {
      contextParts.push(firstPart)
    }

    for (let tailIndex = index + 1; tailIndex < sanitizedSource.length; tailIndex += 1) {
      const tailText = sanitizedSource[tailIndex]?.text ?? ''
      if (tailText.length) {
        contextParts.push(tailText)
      }
    }

    const contextBlock = stripAgentsMdContent(contextParts.join('\n').trim()).sanitized
    const sections = parseIdeContextSections(contextBlock)
    if (!sections.length) {
      continue
    }

    const sanitizedSegments: RenderedSegment[] = []
    for (let keepIndex = 0; keepIndex < index; keepIndex += 1) {
      sanitizedSegments.push({ ...sanitizedSource[keepIndex] })
    }

    const retainedText = text.slice(0, matchIndex).trimEnd()
    if (retainedText.length > 0) {
      sanitizedSegments.push({
        ...segment,
        text: retainedText,
      })
    }

    return {
      sections,
      sanitizedSegments,
    }
  }

  return null
}

export interface SafeHtmlResult {
  html: string
  removed: boolean
}

const ALLOWED_TAGS = new Set([
  'pre',
  'code',
  'strong',
  'em',
  'span',
  'mark',
  'a',
  'ul',
  'ol',
  'li',
  'table',
  'tbody',
  'tr',
  'td',
])

const DROP_ENTIRE_TAGS = new Set(['script', 'style', 'iframe', 'object'])
const ALLOWED_ATTRIBUTES = new Set(['href', 'rel', 'target'])
const EVENT_HANDLER_PATTERN = /^on/i
const SAFE_LINK_PROTOCOL = /^(https?):\/\//i
const SAFE_REL_TOKENS = ['noreferrer', 'noopener']
const SAFE_HREF_FALLBACK = 'about:blank'

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      case "'":
        return '&#39;'
      default:
        return char
    }
  })

export const safeHtml = (input: string): SafeHtmlResult => {
  if (typeof DOMParser === 'undefined') {
    return { html: escapeHtml(input), removed: false }
  }

  const parser = new DOMParser()
  const parsedDocument = parser.parseFromString(input, 'text/html')
  const workingDocument = parsedDocument.implementation.createHTMLDocument('safe-html')
  const sourceBody = parsedDocument.body
  let removed = false

  const sanitizeHref = (value: string): string => {
    const trimmed = value.trim()
    if (!trimmed || !SAFE_LINK_PROTOCOL.test(trimmed)) {
      removed = true
      return SAFE_HREF_FALLBACK
    }
    return trimmed
  }

  const ensureSafeAnchor = (anchor: Element) => {
    const relValue = anchor.getAttribute('rel') ?? ''
    const tokens = new Set(relValue.split(/\s+/).filter(Boolean))
    SAFE_REL_TOKENS.forEach((token) => tokens.add(token))
    anchor.setAttribute('rel', Array.from(tokens).join(' '))

    if (!anchor.hasAttribute('href')) {
      anchor.setAttribute('href', SAFE_HREF_FALLBACK)
      removed = true
    }
  }

  const sanitizeNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return workingDocument.createTextNode(node.textContent ?? '')
    }

    if (node.nodeType === Node.COMMENT_NODE) {
      removed = true
      return null
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element
      const tagName = element.tagName.toLowerCase()

      if (!ALLOWED_TAGS.has(tagName)) {
        removed = true
        if (DROP_ENTIRE_TAGS.has(tagName)) {
          return null
        }

        const fragment = workingDocument.createDocumentFragment()
        element.childNodes.forEach((child) => {
          const sanitizedChild = sanitizeNode(child)
          if (sanitizedChild) {
            fragment.appendChild(sanitizedChild)
          }
        })
        return fragment
      }

      const clone = workingDocument.createElement(tagName)

      Array.from(element.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase()

        if (EVENT_HANDLER_PATTERN.test(name)) {
          removed = true
          return
        }

        if (!ALLOWED_ATTRIBUTES.has(name)) {
          removed = true
          return
        }

        if (name === 'href') {
          clone.setAttribute('href', sanitizeHref(attr.value))
          return
        }

        if (name === 'target') {
          clone.setAttribute('target', attr.value || '_blank')
          return
        }

        if (name === 'rel') {
          clone.setAttribute('rel', attr.value)
        }
      })

      if (tagName === 'a') {
        ensureSafeAnchor(clone)
      }

      element.childNodes.forEach((child) => {
        const sanitizedChild = sanitizeNode(child)
        if (sanitizedChild) {
          clone.appendChild(sanitizedChild)
        }
      })

      return clone
    }

    removed = true
    return null
  }

  parsedDocument.head.childNodes.forEach((child) => {
    sanitizeNode(child)
  })

  const fragment = workingDocument.createDocumentFragment()
  sourceBody.childNodes.forEach((child) => {
    const sanitized = sanitizeNode(child)
    if (sanitized) {
      fragment.appendChild(sanitized)
    }
  })

  const wrapper = workingDocument.createElement('div')
  wrapper.appendChild(fragment)

  return { html: wrapper.innerHTML, removed }
}

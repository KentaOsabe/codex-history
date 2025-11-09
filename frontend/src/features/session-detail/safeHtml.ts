export interface SafeHtmlResult {
  html: string
  removed: boolean
}

export const safeHtml = (input: string): SafeHtmlResult => ({ html: input, removed: false })

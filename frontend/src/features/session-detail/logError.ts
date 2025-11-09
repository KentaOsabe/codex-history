export const logError = (error: unknown, context = 'session-detail'): void => {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error)
  }
}

export default logError

export const logError = (error: unknown, context = 'session-detail'): void => {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error(`[${context}]`, error)
  }
}

export default logError


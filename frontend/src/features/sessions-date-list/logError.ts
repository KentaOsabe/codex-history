export const logError = (error: unknown, context = 'sessions-date-list'): void => {
  const label = `[${context}]`
  if (error instanceof Error) {
    console.error(label, error)
  } else {
    console.error(label, { error })
  }
}

export default logError

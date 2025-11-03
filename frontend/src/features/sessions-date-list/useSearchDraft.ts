import { useCallback, useRef, useState } from 'react'

type UseSearchDraftReturn = [string, (value: string) => void, () => void]

export const useSearchDraft = (initialValue = ''): UseSearchDraftReturn => {
  const initialRef = useRef(initialValue)
  const [ draft, setDraft ] = useState(initialRef.current)

  const updateDraft = useCallback((value: string) => {
    setDraft(value)
  }, [])

  const resetDraft = useCallback(() => {
    setDraft(initialRef.current)
  }, [])

  return [ draft, updateDraft, resetDraft ]
}

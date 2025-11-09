import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

export const useSessionNavigation = () => {
  const navigate = useNavigate()

  const navigateToSessionDetail = useCallback(
    (id: string): void => {
      if (!id) return
      const activeElement = typeof document !== 'undefined' ? document.activeElement : null
      void navigate(`/sessions/${encodeURIComponent(id)}`)
      if (activeElement instanceof HTMLElement) {
        queueMicrotask(() => {
          if (activeElement.isConnected) {
            activeElement.focus()
          }
        })
      }
    },
    [navigate],
  )

  return {
    navigateToSessionDetail,
  }
}

export default useSessionNavigation

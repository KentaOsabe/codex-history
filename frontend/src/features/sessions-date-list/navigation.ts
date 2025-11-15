import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

interface NavigateOptions {
  targetPath?: string
}

export const useSessionNavigation = () => {
  const navigate = useNavigate()

  const navigateToSessionDetail = useCallback(
    (id: string, options?: NavigateOptions): void => {
      if (!id && !options?.targetPath) return
      const activeElement = typeof document !== 'undefined' ? document.activeElement : null
      const target = options?.targetPath ?? `/sessions/${encodeURIComponent(id)}`
      void navigate(target)
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

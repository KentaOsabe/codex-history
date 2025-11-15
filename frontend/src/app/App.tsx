import { RouterProvider } from 'react-router-dom'

import ThemeProvider from '@/features/ui-theme/ThemeProvider'

import appRouter from './AppRouter'

const App = () => {
  return (
    <ThemeProvider>
      <RouterProvider router={appRouter} />
    </ThemeProvider>
  )
}

export default App

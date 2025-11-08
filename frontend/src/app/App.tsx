import { RouterProvider } from 'react-router-dom'

import appRouter from './AppRouter'

const App = () => {
  return <RouterProvider router={appRouter} />
}

export default App

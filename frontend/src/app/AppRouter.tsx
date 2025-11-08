import { createBrowserRouter, type RouteObject } from 'react-router-dom'

import SessionDetailPage from '@/features/session-detail/SessionDetailPage'
import SessionsDateListView from '@/features/sessions-date-list/SessionsDateListView'

import AppErrorBoundary from './AppErrorBoundary'
import AppLayout from './AppLayout'

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <AppErrorBoundary />,
    children: [
      {
        index: true,
        element: <SessionsDateListView />,
      },
      {
        path: 'sessions/:sessionId',
        element: <SessionDetailPage />,
      },
    ],
  },
]

export const createAppRouter = () =>
  createBrowserRouter(appRoutes, {
    basename: import.meta.env.BASE_URL,
  })

const appRouter = createAppRouter()

export default appRouter

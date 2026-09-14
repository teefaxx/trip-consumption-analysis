import { createHashRouter, Outlet, RouterProvider } from 'react-router'
import BottomNav from './components/BottomNav'
import TrackPage from './pages/TrackPage'
import HistoryPage from './pages/HistoryPage'
import AboutPage from './pages/AboutPage'

function Layout() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-gray-50">
      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <TrackPage /> },
      { path: '/history', element: <HistoryPage /> },
      { path: '/about', element: <AboutPage /> },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App

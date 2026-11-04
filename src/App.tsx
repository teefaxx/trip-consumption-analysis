import { useEffect } from 'react'
import { createHashRouter, Outlet, RouterProvider } from 'react-router'
import BottomNav from './components/BottomNav'
import DeviceTripsPrompt from './components/DeviceTripsPrompt'
import TrackPage from './pages/TrackPage'
import HistoryPage from './pages/HistoryPage'
import AboutPage from './pages/AboutPage'
import AccountPage from './pages/AccountPage'
import { useAccountStore } from './store/accountStore'
import { useSampleStore } from './store/sampleStore'

function Layout() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-gray-50">
      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
      <BottomNav />
      <DeviceTripsPrompt />
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
      { path: '/account', element: <AccountPage /> },
    ],
  },
])

function App() {
  const init = useAccountStore((s) => s.init)
  const loadSamples = useSampleStore((s) => s.load)
  useEffect(() => {
    void init()
    void loadSamples()
  }, [init, loadSamples])
  return <RouterProvider router={router} />
}

export default App

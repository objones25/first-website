import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

export function RootLayout() {
  const location = useLocation()

  return (
    <>
      <Navbar />
      <AnimatePresence mode="wait">
        <main key={location.pathname} className="min-h-screen pt-14">
          <Outlet />
        </main>
      </AnimatePresence>
      <Footer />
    </>
  )
}

import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { markEntrancePlayed } from '@/lib/entrance'

// Long enough for the first page's own entrance animations to finish.
const ENTRANCE_MS = 1200

export function RootLayout() {
  const location = useLocation()

  useEffect(() => {
    const timer = setTimeout(markEntrancePlayed, ENTRANCE_MS)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <>
      <Navbar />
      <main key={location.pathname} className="min-h-dvh pt-14">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

import { useEffect, type ReactNode } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { markEntrancePlayed } from '@/lib/entrance'

// Long enough for the first page's own entrance animations to finish.
const ENTRANCE_MS = 1200

export function RootLayout({ account }: { account?: ReactNode }) {
  const location = useLocation()

  useEffect(() => {
    const timer = setTimeout(markEntrancePlayed, ENTRANCE_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <Navbar account={account} />
      <main key={location.pathname} className="min-h-dvh pt-14">
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </>
  )
}

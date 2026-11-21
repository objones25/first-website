import { lazy, Suspense, useState } from 'react'
import { SignInLink } from './Navbar'
import { readSignedInHint } from '@/lib/signedInHint'

const PublicAccount = lazy(() => import('@/components/auth/PublicAccount'))

// The navbar's right-hand control on public pages. A visitor who has never
// signed in gets a plain link and Clerk is not downloaded. A browser that
// signed in before loads Clerk here so the account button (and sign out) shows.
export function PublicAccountSlot() {
  const [signedInBefore] = useState(readSignedInHint)
  if (!signedInBefore) return <SignInLink />
  return (
    // Same size as the account button, so the navbar does not shift when it arrives.
    <Suspense fallback={<span className="inline-block w-7 h-7" />}>
      <PublicAccount />
    </Suspense>
  )
}

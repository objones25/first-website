import { useEffect } from 'react'
import { useAuth, UserButton } from '@clerk/react-router'
import { SignInLink } from '@/components/layout/Navbar'
import { writeSignedInHint } from '@/lib/signedInHint'

// The navbar's right-hand control once Clerk is loaded. It also records the
// session state, which is how the public pages know whether to load Clerk.
export function Account() {
  const { isLoaded, isSignedIn } = useAuth()

  useEffect(() => {
    if (isLoaded) writeSignedInHint(isSignedIn)
  }, [isLoaded, isSignedIn])

  if (!isSignedIn) return <SignInLink />
  return <UserButton appearance={{ elements: { avatarBox: 'w-7 h-7' } }} />
}

import { ClerkProvider, useAuth, UserButton } from '@clerk/react-router'
import { RootLayout } from '@/components/layout/RootLayout'
import { SignInLink } from '@/components/layout/Navbar'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!PUBLISHABLE_KEY) throw new Error('VITE_CLERK_PUBLISHABLE_KEY is not set')

function Account() {
  const { isSignedIn } = useAuth()
  if (!isSignedIn) return <SignInLink />
  return <UserButton appearance={{ elements: { avatarBox: 'w-7 h-7' } }} />
}

// Layout for the routes that need auth (demos, sign-in, sign-up). It is a
// separate lazy chunk so the public pages never download or start Clerk.
// ClerkProvider has to render inside the router because it calls useNavigate().
export default function ClerkLayout() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <RootLayout account={<Account />} />
    </ClerkProvider>
  )
}

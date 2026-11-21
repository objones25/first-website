import { ClerkProvider } from '@clerk/react-router'
import { RootLayout } from '@/components/layout/RootLayout'
import { Account } from './Account'
import { PUBLISHABLE_KEY } from './clerkKey'

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

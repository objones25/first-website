import { ClerkProvider } from '@clerk/react-router'
import { Account } from './Account'
import { PUBLISHABLE_KEY } from './clerkKey'

// The account button for public pages. A lazy chunk, loaded only for a browser
// that signed in before (see PublicAccountSlot).
export default function PublicAccount() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <Account />
    </ClerkProvider>
  )
}

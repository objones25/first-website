import { SignIn } from '@clerk/react-router'
import { useSearchParams } from 'react-router-dom'
import { PageTransition } from '@/components/layout/PageTransition'
import { clerkAppearance } from '@/lib/clerkTheme'

export default function SignInPage() {
  const [params] = useSearchParams()
  const redirectUrl = params.get('redirect_url') ?? '/projects'

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center py-20">
        <SignIn
          appearance={clerkAppearance}
          fallbackRedirectUrl={redirectUrl}
          signUpUrl="/sign-up"
        />
      </div>
    </PageTransition>
  )
}

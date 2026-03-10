import { SignUp } from '@clerk/react-router'
import { PageTransition } from '@/components/layout/PageTransition'
import { clerkAppearance } from '@/lib/clerkTheme'

export default function SignUpPage() {
  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center py-20">
        <SignUp
          appearance={clerkAppearance}
          fallbackRedirectUrl="/projects"
          signInUrl="/sign-in"
        />
      </div>
    </PageTransition>
  )
}

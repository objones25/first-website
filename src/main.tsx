import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { ClerkProvider, AuthenticateWithRedirectCallback } from '@clerk/react-router'
import { RootLayout } from './components/layout/RootLayout'
import NotFound from './pages/NotFound'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!PUBLISHABLE_KEY) throw new Error('VITE_CLERK_PUBLISHABLE_KEY is not set')

const Home = lazy(() => import('./pages/Home'))
const About = lazy(() => import('./pages/About'))
const Projects = lazy(() => import('./pages/Projects'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const Archive = lazy(() => import('./pages/Archive'))
const Contact = lazy(() => import('./pages/Contact'))
const SignInPage = lazy(() => import('./pages/SignIn'))
const SignUpPage = lazy(() => import('./pages/SignUp'))
const Demo = lazy(() => import('./pages/Demo'))

// ClerkProvider must be inside the router so it has access to useNavigate()
function ClerkRoot() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <Outlet />
    </ClerkProvider>
  )
}

const router = createBrowserRouter([
  {
    element: <ClerkRoot />,
    children: [
      {
        path: '/',
        element: <RootLayout />,
        errorElement: <NotFound />,
        children: [
          { index: true, element: <Suspense><Home /></Suspense> },
          { path: 'about', element: <Suspense><About /></Suspense> },
          { path: 'projects', element: <Suspense><Projects /></Suspense> },
          { path: 'projects/:slug', element: <Suspense><ProjectDetail /></Suspense> },
          {
            path: 'projects/:slug/demo',
            element: (
              <Suspense>
                <ProtectedRoute>
                  <Demo />
                </ProtectedRoute>
              </Suspense>
            ),
          },
          { path: 'archive', element: <Suspense><Archive /></Suspense> },
          { path: 'contact', element: <Suspense><Contact /></Suspense> },
          { path: 'sign-in', element: <Suspense><SignInPage /></Suspense> },
          { path: 'sign-in/sso-callback', element: <AuthenticateWithRedirectCallback /> },
          { path: 'sign-up', element: <Suspense><SignUpPage /></Suspense> },
          { path: 'sign-up/sso-callback', element: <AuthenticateWithRedirectCallback /> },
        ],
      },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)

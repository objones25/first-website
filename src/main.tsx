import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { RootLayout } from './components/layout/RootLayout'
import NotFound from './pages/NotFound'
import '@fontsource-variable/inter/wght.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import './index.css'

const Home = lazy(() => import('./pages/Home'))
const About = lazy(() => import('./pages/About'))
const Projects = lazy(() => import('./pages/Projects'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const Archive = lazy(() => import('./pages/Archive'))
const Contact = lazy(() => import('./pages/Contact'))
const Skills = lazy(() => import('./pages/Skills'))

// Everything that imports Clerk lives behind these lazy imports, so the public
// pages above never download it.
const ClerkLayout = lazy(() => import('./components/auth/ClerkLayout'))
const AuthRoutes = {
  SignIn: lazy(() => import('./pages/SignIn')),
  SignUp: lazy(() => import('./pages/SignUp')),
  SsoCallback: lazy(() => import('./components/auth/SsoCallback')),
  Demo: lazy(() => import('./pages/ProtectedDemo')),
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Suspense><Home /></Suspense> },
      { path: 'about', element: <Suspense><About /></Suspense> },
      { path: 'projects', element: <Suspense><Projects /></Suspense> },
      // Placeholder-filled preview of the project page format. The condition is
      // a build-time constant, so the production bundle contains neither the
      // route nor its text.
      ...(import.meta.env.DEV
        ? [{
            path: 'projects/_template',
            lazy: () => import('./pages/ProjectTemplatePreview').then(m => ({ Component: m.default })),
          }, {
            // Layout sketch for an "ask the site" page; canned answers, no model.
            path: 'ask',
            lazy: () => import('./pages/AskSketch').then(m => ({ Component: m.default })),
          }]
        : []),
      // The skills used to be a placeholder project page; keep old links working.
      { path: 'projects/agent-skills', element: <Navigate to="/skills" replace /> },
      { path: 'projects/:slug', element: <Suspense><ProjectDetail /></Suspense> },
      { path: 'skills', element: <Suspense><Skills /></Suspense> },
      { path: 'archive', element: <Suspense><Archive /></Suspense> },
      { path: 'contact', element: <Suspense><Contact /></Suspense> },
      { path: '*', element: <NotFound /> },
    ],
  },
  {
    element: <Suspense><ClerkLayout /></Suspense>,
    errorElement: <NotFound />,
    children: [
      { path: '/projects/:slug/demo', element: <Suspense><AuthRoutes.Demo /></Suspense> },
      { path: '/sign-in', element: <Suspense><AuthRoutes.SignIn /></Suspense> },
      { path: '/sign-in/sso-callback', element: <Suspense><AuthRoutes.SsoCallback /></Suspense> },
      { path: '/sign-up', element: <Suspense><AuthRoutes.SignUp /></Suspense> },
      { path: '/sign-up/sso-callback', element: <Suspense><AuthRoutes.SsoCallback /></Suspense> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)

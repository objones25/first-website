import { useCallback, useRef } from 'react'
import { useAuth } from '@clerk/react-router'

// The demo workers verify a Clerk session token on every request. These tokens
// last about a minute, so callers ask for one right before each request or
// connection instead of holding on to it.
//
// The returned function keeps one identity for the life of the component, so it
// is safe in effect dependency lists: an effect that fires a request (the LLM
// demo's warm-up) must not re-run because Clerk handed back a new function.
export function useSessionToken(): () => Promise<string> {
  const { getToken } = useAuth()
  const latest = useRef(getToken)
  latest.current = getToken

  return useCallback(async () => {
    const token = await latest.current()
    if (!token) throw new Error('Your sign-in has expired. Reload the page and sign in again.')
    return token
  }, [])
}

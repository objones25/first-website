const STORAGE_KEY = 'signed-in-hint'

// A remembered guess at whether this browser has a session. It is not an auth
// check: it only decides whether a public page is worth loading Clerk for, so
// the account button can show. Clerk corrects it whenever it loads.
//
// localStorage can throw (private mode, blocked storage). Reading "signed out"
// is the right degradation: the navbar then shows the plain sign-in link.
export function readSignedInHint(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeSignedInHint(signedIn: boolean): void {
  try {
    if (signedIn) localStorage.setItem(STORAGE_KEY, '1')
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // see comment above: skip the write
  }
}

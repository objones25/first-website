export const EASE = [0.16, 1, 0.3, 1] as const

const STORAGE_KEY = 'entrance-played'

// sessionStorage can throw (private mode, blocked storage). The entrance is cosmetic,
// so playing it again is the right degradation.
function readPlayed(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

let played = readPlayed()

export function hasEntrancePlayed(): boolean {
  return played
}

export function markEntrancePlayed(): void {
  played = true
  try {
    sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // see comment above: skip the write
  }
}

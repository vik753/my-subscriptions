import { create } from 'zustand'
import { CHANGELOG } from '../i18n/changelog'

const SEEN_KEY = 'ui.seenVersion' // tiny UI pref

const read = (): string | null => {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

const write = (version: string) => {
  try {
    localStorage.setItem(SEEN_KEY, version)
  } catch {
    // Private mode: the note may show again next launch.
  }
}

/** a > b for 'X.Y.Z' versions. */
const newer = (a: string, b: string): boolean => {
  const [x, y] = [a.split('.').map(Number), b.split('.').map(Number)]
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return (x[i] ?? 0) > (y[i] ?? 0)
  return false
}

interface WhatsNewState {
  /** Version to announce ("Updated to …"), or null. */
  announce: string | null
  /**
   * Called once data is loaded. A fresh install has nothing to announce; users from before the
   * changelog (no seen version yet, but with hobbies) get the note once.
   */
  init: (current: string, hasData: boolean) => void
  /** The note was closed or the changelog opened. */
  seen: () => void
}

export const useWhatsNew = create<WhatsNewState>((set, get) => ({
  announce: null,
  init: (current, hasData) => {
    const last = read()
    const known = CHANGELOG.some((r) => r.version === current)
    if (last === current) return
    if (last === null && !hasData) return write(current)
    // A rollback to an older build is not an update.
    if (known && (last === null || newer(current, last))) set({ announce: current })
    else write(current)
  },
  seen: () => {
    const { announce } = get()
    if (announce) write(announce)
    set({ announce: null })
  },
}))

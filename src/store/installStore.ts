import { create } from 'zustand'
import { isIOS, isStandalone, onInstallPrompt, type InstallPromptEvent } from '../services/install'

const DISMISSED_KEY = 'ui.installCardDismissed' // tiny UI pref

interface InstallState {
  standalone: boolean
  ios: boolean
  deferred: InstallPromptEvent | null
  dismissed: boolean
  dismiss: () => void
  /** Chromium install dialog; resolves true when accepted. */
  install: () => Promise<boolean>
}

const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export const useInstall = create<InstallState>((set, get) => ({
  standalone: isStandalone(),
  ios: isIOS(),
  deferred: null,
  dismissed: readDismissed(),
  dismiss: () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // Private mode: the card just comes back next launch.
    }
    set({ dismissed: true })
  },
  install: async () => {
    const e = get().deferred
    if (!e) return false
    await e.prompt()
    const { outcome } = await e.userChoice
    set({ deferred: null, standalone: outcome === 'accepted' })
    return outcome === 'accepted'
  },
}))

onInstallPrompt((deferred) => useInstall.setState({ deferred }))

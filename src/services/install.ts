// PWA install helpers. `beforeinstallprompt` exists on Chromium only; iOS needs manual instructions.

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export const isIOS = (): boolean =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export const onInstallPrompt = (handler: (e: InstallPromptEvent) => void): (() => void) => {
  const listener = (e: Event) => {
    e.preventDefault()
    handler(e as InstallPromptEvent)
  }
  window.addEventListener('beforeinstallprompt', listener)
  return () => window.removeEventListener('beforeinstallprompt', listener)
}

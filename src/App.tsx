import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import styles from './App.module.css'
import { detectLanguage } from './i18n'
import { Home } from './screens/Home/Home'
import { HobbyDetail } from './screens/HobbyDetail/HobbyDetail'
import { About } from './screens/About/About'
import { HobbyForm } from './screens/HobbyForm/HobbyForm'
import { Kit } from './screens/Kit/Kit'
import { ScrollToTop } from './screens/ScrollToTop'
import { Settings } from './screens/Settings/Settings'
import { SheetHost } from './screens/sheets/SheetHost'
import { SignIn } from './screens/SignIn/SignIn'
import { useApp } from './store/appStore'
import { useAuth } from './store/authStore'
import { runOpenCheck } from './store/flowStore'
import { createIdbMeta, createIdbStorage } from './store/persistence/storage'
import { startSync } from './store/syncStore'
import { useToast } from './store/toastStore'
import { applyTheme } from './theme/applyTheme'
import { ToastRegion } from './ui/Toast'

// One IndexedDB connection per app launch.
let appStorage: ReturnType<typeof createIdbStorage> | null = null
const getStorage = () => (appStorage ??= createIdbStorage())

export function App() {
  const ready = useApp((s) => s.ready)
  const { scheme, mode, language } = useApp((s) => s.data.settings)
  const auth = useAuth((s) => s.status)
  const known = useAuth((s) => s.known)
  // Only a first-time user is gated; a returning user with an expired session keeps their local
  // data and sees "Sign in again" in the sync status (reauth).
  const toast = useToast()

  useEffect(() => {
    void useApp.getState().load(getStorage(), detectLanguage(navigator.languages))
    void useAuth.getState().init()
    const onVisible = () => {
      if (document.visibilityState === 'visible') useAuth.getState().resume()
    }
    const onOnline = () => useAuth.getState().resume()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  useEffect(() => applyTheme(scheme, mode, language), [scheme, mode, language])

  // App open check (replaces notifications): on launch and whenever the app comes back to the front.
  const gated = !known && auth !== 'signedIn' && auth !== 'offline'
  const checking = !ready || auth === 'checking' || gated
  useEffect(() => {
    if (checking) return
    runOpenCheck()
    const onVisible = () => {
      if (document.visibilityState === 'visible') runOpenCheck()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [checking])

  // Calendar sync for everyone past the sign-in screen; it waits by itself while signed out/offline.
  useEffect(() => (checking ? undefined : startSync(createIdbMeta('sync'))), [checking])

  // Nothing until settings and auth are known — no English flash, no sign-in flicker.
  if (!ready || auth === 'checking') return <main className={styles.shell} aria-busy="true" />

  // DEV ONLY: UI kit for visual verification (tree-shaken from production builds).
  if (import.meta.env.DEV && window.location.hash === '#kit')
    return (
      <main className={styles.shell} aria-busy="false">
        <Kit />
      </main>
    )

  return (
    <main className={styles.shell} aria-busy="false">
      {!gated ? (
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/new" element={<HobbyForm />} />
            <Route path="/hobby/:id" element={<HobbyDetail />} />
            <Route path="/hobby/:id/edit" element={<HobbyForm />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <SheetHost />
        </BrowserRouter>
      ) : (
        <SignIn />
      )}
      <ToastRegion message={toast.message} leaving={toast.leaving} />
    </main>
  )
}

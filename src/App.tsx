import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import styles from './App.module.css'
import { detectLanguage, messages } from './i18n'
import { Home } from './screens/Home/Home'
import { HobbyDetail } from './screens/HobbyDetail/HobbyDetail'
import { About } from './screens/About/About'
import { HobbyForm } from './screens/HobbyForm/HobbyForm'
import { Kit } from './screens/Kit/Kit'
import { ScrollToTop } from './screens/ScrollToTop'
import { Settings } from './screens/Settings/Settings'
import { SheetHost } from './screens/sheets/SheetHost'
import { UpdateBanner } from './screens/UpdateBanner'
import { useApp } from './store/appStore'
import { useAuth } from './store/authStore'
import { runOpenCheck, useFlow } from './store/flowStore'
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
  const toast = useToast()
  const t = messages[language]
  const sheetOpen = useFlow((s) => s.sheet !== null)

  useEffect(() => {
    // Auth needs the data first: silent renewal only happens when a hobby uses Google.
    void useApp
      .getState()
      .load(getStorage(), detectLanguage(navigator.languages))
      .then(() => useAuth.getState().init())
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

  // A failed or refused Google sign-in: the app keeps working locally, just say so.
  useEffect(() => {
    if (auth === 'error') useToast.getState().show(t.signErr)
    if (auth === 'denied') useToast.getState().show(t.signDenied)
  }, [auth, t])

  // App open check (replaces notifications): on launch and whenever the app comes back to the front.
  const checking = !ready || auth === 'checking'
  useEffect(() => {
    if (checking) return
    runOpenCheck()
    const onVisible = () => {
      if (document.visibilityState === 'visible') runOpenCheck()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [checking])

  // Google sync; it waits by itself while signed out/offline and only touches opted-in hobbies.
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
      {import.meta.env.PROD && <UpdateBanner />}
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
      <ToastRegion message={toast.message} leaving={toast.leaving} top={sheetOpen} />
    </main>
  )
}

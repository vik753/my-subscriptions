import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import styles from './App.module.css'
import { detectLanguage } from './i18n'
import { Home } from './screens/Home/Home'
import { HobbyDetail } from './screens/HobbyDetail/HobbyDetail'
import { HobbyForm } from './screens/HobbyForm/HobbyForm'
import { Kit } from './screens/Kit/Kit'
import { SignIn } from './screens/SignIn/SignIn'
import { useApp } from './store/appStore'
import { useAuth } from './store/authStore'
import { createIdbStorage } from './store/persistence/storage'
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

  // Nothing until settings and auth are known — no English flash, no sign-in flicker.
  if (!ready || auth === 'checking') return <main className={styles.shell} aria-busy="true" />

  // DEV ONLY: UI kit for visual verification (tree-shaken from production builds).
  if (import.meta.env.DEV && window.location.hash === '#kit')
    return (
      <main className={styles.shell} aria-busy="false">
        <Kit />
      </main>
    )

  const signedIn = auth === 'signedIn' || auth === 'offline'
  return (
    <main className={styles.shell} aria-busy="false">
      {signedIn ? (
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/new" element={<HobbyForm />} />
            <Route path="/hobby/:id" element={<HobbyDetail />} />
            <Route path="/hobby/:id/edit" element={<HobbyForm />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      ) : (
        <SignIn />
      )}
      <ToastRegion message={toast.message} leaving={toast.leaving} />
    </main>
  )
}

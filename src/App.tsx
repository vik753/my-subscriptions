import { useEffect } from 'react'
import styles from './App.module.css'
import { APP_NAME, detectLanguage } from './i18n'
import { AuthSpike } from './screens/AuthSpike/AuthSpike'
import { useApp } from './store/appStore'
import { useAuth } from './store/authStore'
import { createIdbStorage } from './store/persistence/storage'
import { useT } from './store/useT'
import { applyTheme } from './theme/applyTheme'

// One IndexedDB connection per app launch.
let appStorage: ReturnType<typeof createIdbStorage> | null = null
const getStorage = () => (appStorage ??= createIdbStorage())

export function App() {
  const t = useT()
  const ready = useApp((s) => s.ready)
  const { scheme, mode, language } = useApp((s) => s.data.settings)

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

  // Render nothing until settings are loaded, so uk/ru users never see an English flash.
  if (!ready) return <main className={styles.shell} aria-busy="true" />

  return (
    <main className={styles.shell} aria-busy="false">
      <h1 className={styles.title}>{APP_NAME}</h1>
      <p className={styles.tagline}>{t.signSub}</p>
      <AuthSpike />
    </main>
  )
}

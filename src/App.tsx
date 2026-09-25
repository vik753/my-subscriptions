import { useEffect } from 'react'
import styles from './App.module.css'
import { translate } from './i18n/useT'
import { AuthSpike } from './screens/AuthSpike/AuthSpike'
import { useAuth } from './store/authStore'

export function App() {
  useEffect(() => {
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

  return (
    <main className={styles.shell}>
      <h1 className={styles.title}>{translate('en', 'appName')}</h1>
      <p className={styles.tagline}>{translate('en', 'appTagline')}</p>
      <AuthSpike />
    </main>
  )
}

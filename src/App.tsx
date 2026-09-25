import styles from './App.module.css'
import { translate } from './i18n/useT'

export function App() {
  return (
    <main className={styles.shell}>
      <h1 className={styles.title}>{translate('en', 'appName')}</h1>
      <p className={styles.tagline}>{translate('en', 'appTagline')}</p>
    </main>
  )
}

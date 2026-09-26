import { ArrowsClockwise } from '@phosphor-icons/react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useT } from '../store/useT'
import { Button } from '../ui/Button'
import styles from './UpdateBanner.module.css'

const CHECK_MS = 60 * 60 * 1000

/** "A new version is available" — the new service worker waits until the user taps Update. */
export function UpdateBanner() {
  const t = useT()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // An installed app can stay open for days: look for updates hourly and on every return.
      window.setInterval(() => void registration.update(), CHECK_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update()
      })
    },
  })

  if (!needRefresh) return null

  return (
    <div className={styles.banner} role="status">
      <ArrowsClockwise size={18} className={styles.icon} aria-hidden="true" />
      <span className={styles.text}>{t.updateAvail}</span>
      <Button variant="primary" onClick={() => void updateServiceWorker(true)}>
        {t.updateBtn}
      </Button>
    </div>
  )
}

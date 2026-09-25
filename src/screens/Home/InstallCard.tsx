import { DownloadSimple, ShareNetwork, X } from '@phosphor-icons/react'
import { useInstall } from '../../store/installStore'
import { useToast } from '../../store/toastStore'
import { useT } from '../../store/useT'
import { Button, IconButton } from '../../ui/Button'
import styles from './Home.module.css'

/** "Add to Home Screen" hint shown until installed or dismissed. */
export function InstallCard() {
  const t = useT()
  const { standalone, dismissed, ios, deferred, dismiss, install } = useInstall()
  const toast = useToast((s) => s.show)
  if (standalone || dismissed) return null

  return (
    <section className={styles.install} aria-label={t.install}>
      <span className={styles.installHead}>
        <span className={styles.installTile} aria-hidden="true">
          <DownloadSimple />
        </span>
        <span className={styles.installTitle}>{t.install}</span>
        <IconButton size="small" label={t.close} icon={<X />} onClick={dismiss} />
      </span>
      {ios ? (
        <span className={styles.installText}>
          {t.installIOSa} <ShareNetwork aria-hidden="true" /> {t.installIOSb}
        </span>
      ) : (
        <>
          <span className={styles.installText}>{t.installDesk}</span>
          {deferred && (
            <Button
              variant="primary"
              block
              onClick={() => void install().then((ok) => ok && toast(t.tInstalled))}
            >
              {t.installBtn}
            </Button>
          )}
        </>
      )}
    </section>
  )
}

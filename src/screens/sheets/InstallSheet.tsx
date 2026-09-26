import { DownloadSimple, ShareNetwork } from '@phosphor-icons/react'
import { useFlow } from '../../store/flowStore'
import { useInstall } from '../../store/installStore'
import { useToast } from '../../store/toastStore'
import { useT } from '../../store/useT'
import { Button } from '../../ui/Button'
import styles from './sheets.module.css'

/** "Add to Home Screen" from Settings: iOS instructions or the browser's install dialog. */
export function InstallSheet() {
  const t = useT()
  const { ios, deferred, install } = useInstall()
  const close = () => useFlow.getState().close()

  return (
    <>
      <h2 className={styles.title}>{t.install}</h2>
      {ios ? (
        <p className={styles.body}>
          {t.installIOSa} <ShareNetwork aria-hidden="true" /> {t.installIOSb}
        </p>
      ) : (
        <>
          <p className={styles.body}>{t.installDesk}</p>
          {deferred && (
            <Button
              variant="primary"
              block
              tall
              icon={<DownloadSimple />}
              onClick={() =>
                void install().then((ok) => {
                  close()
                  if (ok) useToast.getState().show(t.tInstalled)
                })
              }
            >
              {t.installBtn}
            </Button>
          )}
        </>
      )}
      <Button variant="ghost" block onClick={close}>
        {ios || !deferred ? t.close : t.cancel}
      </Button>
    </>
  )
}

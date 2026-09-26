import { CloudSlash, Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { usesGoogle } from '../../store/authStore'
import { useFlow } from '../../store/flowStore'
import { wipeAllData, wipeGoogleData } from '../../store/syncStore'
import { useToast } from '../../store/toastStore'
import { useT } from '../../store/useT'
import { Button } from '../../ui/Button'
import styles from './sheets.module.css'

/** "Delete data?": everything (phone + Google) or only the Google copies (calendar + Drive). */
export function WipeSheet({ onDone }: { onDone: () => void }) {
  const t = useT()
  const [busy, setBusy] = useState<'all' | 'google' | null>(null)
  const close = () => useFlow.getState().close()
  const toast = useToast.getState().show

  const wipeAll = async () => {
    setBusy('all')
    await wipeAllData()
    close()
    toast(t.tWiped)
    onDone()
  }

  const wipeGoogle = async () => {
    setBusy('google')
    const ok = await wipeGoogleData()
    setBusy(null)
    if (!ok) return toast(t.wipeGoogleNeeds)
    close()
    toast(t.tWipedGoogle)
  }

  return (
    <>
      <div className={styles.head}>
        <h2 className={styles.title}>{t.wipeTitle}</h2>
        <p className={styles.body}>{t.wipeBody}</p>
      </div>
      <Button
        variant="primary"
        block
        tall
        icon={<Trash />}
        loading={busy === 'all'}
        disabled={busy !== null}
        onClick={() => void wipeAll()}
      >
        {t.wipeAllBtn}
      </Button>
      <p className={styles.hint}>{t.wipeAllSub}</p>
      {usesGoogle() && (
        <>
          <Button
            variant="secondary"
            block
            tall
            icon={<CloudSlash />}
            loading={busy === 'google'}
            disabled={busy !== null}
            onClick={() => void wipeGoogle()}
          >
            {t.wipeGoogleBtn}
          </Button>
          <p className={styles.hint}>{t.wipeGoogleSub}</p>
        </>
      )}
      <Button variant="ghost" block disabled={busy !== null} onClick={close}>
        {t.cancel}
      </Button>
    </>
  )
}

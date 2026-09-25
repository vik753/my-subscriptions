import { Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { useFlow } from '../../store/flowStore'
import { wipeAllData } from '../../store/syncStore'
import { useToast } from '../../store/toastStore'
import { useT } from '../../store/useT'
import { Button } from '../../ui/Button'
import styles from './sheets.module.css'

/** "Delete all data?" confirmation: calendar, Drive backup and this device. */
export function WipeSheet({ onDone }: { onDone: () => void }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const close = () => useFlow.getState().close()

  const wipe = async () => {
    setBusy(true)
    await wipeAllData()
    close()
    useToast.getState().show(t.tWiped)
    onDone()
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
        loading={busy}
        onClick={() => void wipe()}
      >
        {t.wipeBtn}
      </Button>
      <Button variant="ghost" block disabled={busy} onClick={close}>
        {t.cancel}
      </Button>
    </>
  )
}

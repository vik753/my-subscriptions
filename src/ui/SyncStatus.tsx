import { CalendarCheck, CloudSlash, Warning } from '@phosphor-icons/react'
import { Button } from './Button'
import { Spinner } from './Spinner'
import styles from './SyncStatus.module.css'

export type SyncState = 'ok' | 'syncing' | 'offline' | 'reauth'

/** Sync line under the hobby title (design "Storage & sync"). Labels come from i18n. */
export function SyncStatus({
  state,
  label,
  actionLabel,
  onAction,
}: {
  state: SyncState
  label: string
  /** Only for `reauth`. */
  actionLabel?: string
  onAction?: () => void
}) {
  const icon = {
    ok: <CalendarCheck size={16} aria-hidden="true" />,
    syncing: <Spinner size={16} />,
    offline: <CloudSlash size={16} aria-hidden="true" />,
    reauth: <Warning size={16} className={styles.warn} aria-hidden="true" />,
  }[state]
  return (
    <div className={styles.status} role="status">
      {icon}
      <span className={styles.label}>{label}</span>
      {state === 'reauth' && actionLabel && (
        <Button variant="ghost" className={styles.action} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

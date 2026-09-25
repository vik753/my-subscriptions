import { CheckCircle } from '@phosphor-icons/react'
import styles from './Toast.module.css'

/**
 * Always-mounted live region; only its content changes, so screen readers announce every toast.
 * The queue and timing live in the store (`toastStore`).
 */
export function ToastRegion({ message, leaving }: { message: string | null; leaving?: boolean }) {
  return (
    <div role="status" aria-live="polite" className={styles.region}>
      {message && (
        <div className={`${styles.toast} ${leaving ? styles.leaving : ''}`}>
          <CheckCircle size={18} className={styles.icon} aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}
    </div>
  )
}

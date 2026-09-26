import { CheckCircle } from '@phosphor-icons/react'
import { createPortal } from 'react-dom'
import styles from './Toast.module.css'

/**
 * Always-mounted live region; only its content changes, so screen readers announce every toast.
 * Rendered into <body> so an open sheet (which makes the app root inert) doesn't silence it.
 * `top`: a sheet is open — show the toast at the top so it never covers the sheet's buttons.
 * The queue and timing live in the store (`toastStore`).
 */
export function ToastRegion({
  message,
  leaving,
  top,
}: {
  message: string | null
  leaving?: boolean
  top?: boolean
}) {
  return createPortal(
    <div role="status" aria-live="polite" className={styles.region}>
      {message && (
        <div
          className={`${styles.toast} ${top ? styles.top : ''} ${leaving ? styles.leaving : ''}`}
        >
          <CheckCircle size={18} className={styles.icon} aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}
    </div>,
    document.body,
  )
}

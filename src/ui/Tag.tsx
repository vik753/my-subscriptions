import type { ReactNode } from 'react'
import styles from './Tag.module.css'

export type SessionPillStatus = 'paid' | 'unpaid' | 'attended' | 'pending' | 'cancelled' | 'forfeit'

/** Small label on cards ("Renew soon", "Unmarked: 2"). */
export function Tag({
  children,
  icon,
  variant = 'accent',
  onClick,
}: {
  children: ReactNode
  icon?: ReactNode
  variant?: 'accent' | 'neutral'
  onClick?: () => void
}) {
  const cls = `${styles.tag} ${styles[variant]}`
  const content = (
    <>
      {icon}
      {children}
    </>
  )
  return onClick ? (
    <button type="button" className={`${cls} ${styles.clickable}`} onClick={onClick}>
      {content}
    </button>
  ) : (
    <span className={cls}>{content}</span>
  )
}

/** Session status pill (lists, sheets). The label always carries the meaning, not just color. */
export function StatusPill({
  status,
  children,
}: {
  status: SessionPillStatus
  children: ReactNode
}) {
  return <span className={`${styles.pill} ${styles[status]}`}>{children}</span>
}

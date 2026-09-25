import type { ReactNode } from 'react'
import styles from './Card.module.css'

/**
 * Surface card (hobby cards, install card). Clickable cards render as a button whose content is
 * its accessible name — pass phrasing content only (span, strong), no block elements.
 */
export function Card({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return onClick ? (
    <button type="button" className={`${styles.card} ${styles.clickable}`} onClick={onClick}>
      {children}
    </button>
  ) : (
    <div className={styles.card}>{children}</div>
  )
}

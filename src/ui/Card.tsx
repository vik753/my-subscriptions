import type { ReactNode } from 'react'
import styles from './Card.module.css'

/**
 * Surface card (hobby cards, install card). A clickable card is covered by one button named
 * `label`; buttons inside the content (e.g. a tag) sit above it, so no button is nested in another.
 */
export function Card({
  children,
  onClick,
  label,
}: {
  children: ReactNode
  onClick?: () => void
  label?: string
}) {
  return (
    <div className={`${styles.card} ${onClick ? styles.clickable : ''}`}>
      {onClick && (
        <button type="button" className={styles.cover} aria-label={label} onClick={onClick} />
      )}
      {children}
    </div>
  )
}

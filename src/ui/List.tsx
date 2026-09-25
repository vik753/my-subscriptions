import { CaretRight, CheckCircle, Circle } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import styles from './List.module.css'

/** Section with a 13px label above a grouped surface list (Settings, About). */
export function ListSection({
  title,
  hint,
  children,
}: {
  title?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className={styles.section}>
      {title && <h2 className={styles.title}>{title}</h2>}
      <div className={styles.group} role={title ? 'group' : undefined} aria-label={title}>
        {children}
      </div>
      {hint && <p className={styles.hint}>{hint}</p>}
    </section>
  )
}

/** 52px row: optional leading icon, label + sub, trailing slot (value, radio, switch, chevron). */
export function ListRow({
  icon,
  label,
  sub,
  trailing,
  onClick,
  selected,
  href,
  chevron,
}: {
  icon?: ReactNode
  label: string
  sub?: string
  trailing?: ReactNode
  onClick?: () => void
  /** Renders a radio mark and `aria-checked` (radio lists). */
  selected?: boolean
  href?: string
  chevron?: boolean
}) {
  const content = (
    <>
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {sub && <span className={styles.sub}>{sub}</span>}
      </span>
      {trailing}
      {selected !== undefined && <RadioMark checked={selected} />}
      {chevron && <CaretRight size={14} className={styles.chevron} aria-hidden="true" />}
    </>
  )
  if (href)
    return (
      <a
        className={`${styles.row} ${styles.interactive}`}
        href={href}
        target="_blank"
        rel="noreferrer"
      >
        {content}
      </a>
    )
  if (onClick)
    return (
      <button
        type="button"
        className={`${styles.row} ${styles.interactive}`}
        onClick={onClick}
        {...(selected !== undefined && { 'aria-pressed': selected })}
      >
        {content}
      </button>
    )
  return <div className={styles.row}>{content}</div>
}

/** Filled accent check when selected, neutral circle otherwise. */
export function RadioMark({ checked }: { checked: boolean }) {
  return checked ? (
    <CheckCircle size={22} weight="fill" className={styles.checked} aria-hidden="true" />
  ) : (
    <Circle size={22} className={styles.unchecked} aria-hidden="true" />
  )
}

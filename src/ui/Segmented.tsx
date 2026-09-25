import type { ReactNode } from 'react'
import styles from './Segmented.module.css'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

/** Segmented control (Theme, Home tabs, payment mode, reminder minutes). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Accessible name of the group. */
  label: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={styles.group}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          className={`${styles.option} ${o.value === value ? styles.selected : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.icon}
          <span className={styles.text}>{o.label}</span>
        </button>
      ))}
    </div>
  )
}

import { RadioMark } from './List'
import styles from './SchemeCard.module.css'

/** Color scheme choice: a mini preview painted with that scheme's own tokens. */
export function SchemeCard({
  scheme,
  mode,
  label,
  selected,
  onSelect,
}: {
  scheme: string
  mode: string
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className={styles.preview} data-scheme={scheme} data-mode={mode} aria-hidden="true">
        <span className={styles.pills}>
          <span className={styles.paid} />
          <span className={styles.paid} />
          <span className={styles.unpaid} />
        </span>
        <span className={styles.bottom}>
          <span className={styles.bar} />
          <span className={styles.ring} />
        </span>
      </span>
      <span className={styles.name}>
        {label}
        <RadioMark checked={selected} />
      </span>
    </button>
  )
}

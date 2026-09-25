import styles from './DayChips.module.css'

/** Seven weekday toggles (Mon → Sun). `names` are the short names from i18n (`days`). */
export function DayChips({
  names,
  selected,
  onToggle,
  label,
}: {
  names: readonly string[]
  selected: ReadonlySet<number>
  onToggle: (weekday: number) => void
  label: string
}) {
  return (
    <div role="group" aria-label={label} className={styles.chips}>
      {names.map((name, day) => (
        <button
          key={name}
          type="button"
          aria-pressed={selected.has(day)}
          className={`${styles.chip} ${selected.has(day) ? styles.on : ''}`}
          onClick={() => onToggle(day)}
        >
          {name}
        </button>
      ))}
    </div>
  )
}

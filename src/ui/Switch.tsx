import styles from './Switch.module.css'

/** On/off switch (44×26). Wrap in a row with a visible label, or pass `label` for screen readers. */
type SwitchName = { label: string; labelledBy?: never } | { labelledBy: string; label?: never }

export function Switch({
  checked,
  onChange,
  label,
  labelledBy,
}: { checked: boolean; onChange: (checked: boolean) => void } & SwitchName) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-labelledby={labelledBy}
      className={`${styles.track} ${checked ? styles.on : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.knob} />
    </button>
  )
}

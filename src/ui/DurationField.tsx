import { CaretDown } from '@phosphor-icons/react'
import styles from './DurationField.module.css'

const DURATION_PRESETS = [30, 45, 60, 90, 120] as const

/**
 * Minutes input + "min" + caret opening the presets (design Create/Edit §3). The caret is a native
 * select, like the currency field: the phone shows its own picker and the schedule row keeps its
 * height (an in-page list stretched the whole block). Any other value is typed into the input.
 */
export function DurationField({
  value,
  onChange,
  minLabel,
  label,
  presetsLabel,
  placeholder = '60',
}: {
  value: number | null
  onChange: (minutes: number | null) => void
  /** Localized "min". */
  minLabel: string
  /** Accessible name of the input. */
  label: string
  /** Accessible name of the presets picker. */
  presetsLabel: string
  placeholder?: string
}) {
  const preset = DURATION_PRESETS.find((m) => m === value)
  return (
    <div className={styles.combo}>
      <input
        className={styles.input}
        inputMode="numeric"
        aria-label={label}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').slice(0, 3)
          onChange(digits ? Number(digits) : null)
        }}
      />
      <span className={styles.unit}>{minLabel}</span>
      <span className={styles.caret}>
        <CaretDown size={14} aria-hidden="true" />
        <select
          className={styles.picker}
          aria-label={presetsLabel}
          value={preset === undefined ? '' : String(preset)}
          onChange={(e) => e.target.value && onChange(Number(e.target.value))}
        >
          {/* A typed value that is not a preset (iOS may show hidden options, so only then). */}
          {preset === undefined && (
            <option value="" disabled hidden>
              {value ?? ''}
            </option>
          )}
          {DURATION_PRESETS.map((m) => (
            <option key={m} value={m}>
              {m} {minLabel}
            </option>
          ))}
        </select>
      </span>
    </div>
  )
}

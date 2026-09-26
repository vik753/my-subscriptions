import { CaretDown, Check } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import styles from './DurationField.module.css'

const DURATION_PRESETS = [30, 45, 60, 90, 120] as const

/**
 * Minutes input + "min" + caret revealing the presets (design Create/Edit §3). The presets drop
 * down as a vertical list in the flow: a row of chips did not fit the narrow schedule column.
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
  /** Accessible name of the caret button. */
  presetsLabel: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const caret = useRef<HTMLButtonElement>(null)
  return (
    <div className={styles.wrap}>
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
        <button
          type="button"
          ref={caret}
          className={styles.caret}
          aria-label={presetsLabel}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <CaretDown size={14} aria-hidden="true" className={open ? styles.flipped : undefined} />
        </button>
      </div>
      {open && (
        <div
          className={styles.presets}
          role="group"
          aria-label={presetsLabel}
          onKeyDown={(e) => {
            if (e.key !== 'Escape') return
            setOpen(false)
            // The focused preset unmounts: keep focus on the field instead of the page.
            caret.current?.focus()
          }}
        >
          {DURATION_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={value === m}
              className={`${styles.preset} ${value === m ? styles.selected : ''}`}
              onClick={() => {
                onChange(m)
                setOpen(false)
              }}
            >
              <span>
                {m} {minLabel}
              </span>
              {value === m && <Check size={16} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

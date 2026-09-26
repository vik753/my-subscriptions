import { CaretDown, CaretUp, Check } from '@phosphor-icons/react'
import { useId, useState } from 'react'
import styles from './ColorPicker.module.css'

/**
 * Google Calendar-style color dropdown: the chosen color, and on tap the list of colors with
 * their names. `options[].id` is the Google `colorId` ("1"–"11"), painted with `--gcal-<id>`.
 */
export function ColorPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly { id: string; name: string }[]
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const current = options.find((o) => o.id === value) ?? options[0]
  const dot = (id: string) => (
    <span className={styles.dot} style={{ background: `var(--gcal-${id})` }} aria-hidden="true" />
  )

  return (
    <div className={styles.picker}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(!open)}
      >
        <span className={styles.label}>{label}</span>
        {current && dot(current.id)}
        <span className={styles.name}>{current?.name}</span>
        {open ? <CaretUp aria-hidden="true" /> : <CaretDown aria-hidden="true" />}
      </button>
      {open && (
        <div id={listId} role="radiogroup" aria-label={label} className={styles.list}>
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={o.id === value}
              className={styles.item}
              onClick={() => {
                onChange(o.id)
                setOpen(false)
              }}
            >
              {dot(o.id)}
              <span className={styles.itemName}>{o.name}</span>
              {o.id === value && <Check className={styles.check} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

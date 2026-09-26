import { Plus, X } from '@phosphor-icons/react'
import { useId, useState } from 'react'
import styles from './GuestList.module.css'

/** Guest emails with an "add" field; the caller validates (`onAdd` returns an error or null). */
export function GuestList({
  label,
  hint,
  guests,
  placeholder,
  addLabel,
  removeLabel,
  onAdd,
  onRemove,
}: {
  label: string
  hint: string
  guests: readonly string[]
  placeholder: string
  addLabel: string
  removeLabel: (email: string) => string
  onAdd: (email: string) => string | null
  onRemove: (email: string) => void
}) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()
  const errorId = useId()

  const add = () => {
    const problem = onAdd(draft.trim())
    setError(problem)
    if (!problem) setDraft('')
  }

  return (
    <div className={styles.guests}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
        <span className={styles.hint}>{hint}</span>
      </label>
      {guests.length > 0 && (
        <ul className={styles.chips}>
          {guests.map((g) => (
            <li key={g} className={styles.chip}>
              <span className={styles.email}>{g}</span>
              <button
                type="button"
                className={styles.remove}
                aria-label={removeLabel(g)}
                onClick={() => onRemove(g)}
              >
                <X aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.addRow}>
        <input
          id={inputId}
          className={styles.input}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={placeholder}
          value={draft}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <button type="button" className={styles.add} onClick={add} disabled={!draft.trim()}>
          <Plus aria-hidden="true" />
          {addLabel}
        </button>
      </div>
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

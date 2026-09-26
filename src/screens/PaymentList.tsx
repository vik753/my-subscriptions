import { CaretRight } from '@phosphor-icons/react'
import type { Hobby } from '../domain'
import { formatDate, formatMoney } from '../i18n/format'
import { useFlow } from '../store/flowStore'
import { useLanguage, useT } from '../store/useT'
import styles from './PaymentList.module.css'

/** Payments, newest first; tap one to correct or delete it (hobby detail and edit form). */
export function PaymentList({ hobby }: { hobby: Hobby }) {
  const t = useT()
  const lang = useLanguage()
  const open = useFlow((s) => s.open)
  const last = hobby.payments.length - 1

  return (
    <ul className={styles.list}>
      {[...hobby.payments].reverse().map((p, i) => (
        <li key={`${p.date}-${last - i}`}>
          <button
            type="button"
            className={styles.row}
            aria-label={`${t.editPayTitle}: ${formatDate(lang, p.date)}, ${t.payN(p.n)}, ${formatMoney(p.price, hobby.currency)}`}
            onClick={() => open({ kind: 'editPayment', hobbyId: hobby.id, index: last - i })}
          >
            <span className={styles.text}>
              <span className={styles.title}>{formatDate(lang, p.date)}</span>
              <span className={styles.sub}>{t.payN(p.n)}</span>
            </span>
            <span className={styles.amount}>{formatMoney(p.price, hobby.currency)}</span>
            <CaretRight size={14} className={styles.chevron} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  )
}

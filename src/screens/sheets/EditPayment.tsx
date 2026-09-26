import { Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { editPayment, removePayment, type Hobby } from '../../domain'
import { currencyLabel } from '../../i18n/format'
import { parsePrice, priceInput } from '../../i18n/money'
import { useApp } from '../../store/appStore'
import { useFlow } from '../../store/flowStore'
import { useToast } from '../../store/toastStore'
import { useLanguage, useT } from '../../store/useT'
import { Button } from '../../ui/Button'
import { Field, TextInput } from '../../ui/Field'
import styles from './sheets.module.css'

/** Correct a recorded payment (date, sessions, amount) or delete it. */
export function EditPayment({ hobby, index }: { hobby: Hobby; index: number }) {
  const t = useT()
  const lang = useLanguage()
  // The payment as it was when the sheet opened: a sync may reorder or shorten the list meanwhile,
  // and then this sheet must not touch whatever now sits at `index`.
  const [original] = useState(() => hobby.payments[index])
  const payment = original
  const [confirming, setConfirming] = useState(false)
  const [date, setDate] = useState(payment?.date ?? '')
  const [count, setCount] = useState(String(payment?.n ?? ''))
  const [price, setPrice] = useState(payment ? priceInput(payment.price) : '')
  if (!payment) return null

  const n = Number(count)
  // Unlike a new pass, a corrected amount can't be left empty (that would silently mean 0).
  const minor = price.trim() === '' ? null : parsePrice(price)
  const close = () => useFlow.getState().close()
  const { updateHobby } = useApp.getState()
  const toast = useToast.getState().show

  const unchanged = (h: Hobby) => {
    const p = h.payments[index]
    return (
      p !== undefined &&
      p.date === payment.date &&
      p.n === payment.n &&
      p.price === payment.price &&
      p.from === payment.from
    )
  }
  // Applies the change only if the payment is still where it was; otherwise says so.
  const apply = (change: (h: Hobby) => Hobby, done: string) => {
    const current = useApp.getState().data.hobbies.find((h) => h.id === hobby.id)
    const ok = current !== undefined && unchanged(current)
    if (ok) updateHobby(hobby.id, (h) => (unchanged(h) ? change(h) : h))
    close()
    toast(ok ? done : t.tPayChanged)
  }

  const save = () => {
    if (!(n > 0) || minor === null || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return toast(t.fillAll)
    apply((h) => editPayment(h, index, { ...payment, date, n, price: minor }), t.tPayUpdated)
  }

  const remove = () => apply((h) => removePayment(h, index), t.tPayDeleted)

  if (confirming)
    return (
      <>
        <div className={styles.head}>
          <span className={styles.kicker}>{hobby.name}</span>
          <h2 className={styles.title}>{t.delPayTitle}</h2>
          <p className={styles.body}>{t.delPayBody}</p>
        </div>
        <Button variant="primary" block tall icon={<Trash />} onClick={remove}>
          {t.wipeBtn}
        </Button>
        <Button variant="ghost" block onClick={() => setConfirming(false)}>
          {t.cancel}
        </Button>
      </>
    )

  return (
    <>
      <div className={styles.head}>
        <span className={styles.kicker}>{hobby.name}</span>
        <h2 className={styles.title}>{t.editPayTitle}</h2>
      </div>
      <Field label={t.payDate}>
        {(id) => (
          <TextInput id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        )}
      </Field>
      <div className={styles.grid2}>
        <Field label={t.rSessions}>
          {(id) => (
            <TextInput
              id={id}
              inputMode="numeric"
              value={count}
              onChange={(e) => setCount(e.target.value.replace(/\D/g, '').slice(0, 3))}
            />
          )}
        </Field>
        <Field label={`${t.payAmount}, ${currencyLabel(lang, hobby.currency)}`}>
          {(id) => (
            <TextInput
              id={id}
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ''))}
            />
          )}
        </Field>
      </div>
      <Button variant="primary" block tall onClick={save}>
        {t.save}
      </Button>
      <Button variant="ghost" block icon={<Trash />} onClick={() => setConfirming(true)}>
        {t.delPayment}
      </Button>
      <Button variant="ghost" block onClick={close}>
        {t.cancel}
      </Button>
    </>
  )
}

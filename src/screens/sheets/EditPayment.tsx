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
  const payment = hobby.payments[index]
  const [date, setDate] = useState(payment?.date ?? '')
  const [count, setCount] = useState(String(payment?.n ?? ''))
  const [price, setPrice] = useState(payment ? priceInput(payment.price) : '')
  if (!payment) return null

  const n = Number(count)
  const minor = parsePrice(price)
  const close = () => useFlow.getState().close()
  const { updateHobby } = useApp.getState()
  const toast = useToast.getState().show

  const save = () => {
    if (!(n > 0) || minor === null || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return toast(t.fillAll)
    updateHobby(hobby.id, (h) => editPayment(h, index, { date, n, price: minor }))
    close()
    toast(t.tPayUpdated)
  }

  const remove = () => {
    updateHobby(hobby.id, (h) => removePayment(h, index))
    close()
    toast(t.tPayDeleted)
  }

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
      <Button variant="ghost" block icon={<Trash />} onClick={remove}>
        {t.delPayment}
      </Button>
      <Button variant="ghost" block onClick={close}>
        {t.cancel}
      </Button>
    </>
  )
}

import { useState } from 'react'
import { addPayment, summarize, type Hobby, type SessionKey } from '../../domain'
import { currencyLabel, formatDate, formatSchedule } from '../../i18n/format'
import { parsePrice, priceInput } from '../../i18n/money'
import { useApp } from '../../store/appStore'
import { localClock } from '../../store/clock'
import { useFlow } from '../../store/flowStore'
import { useToast } from '../../store/toastStore'
import { useLanguage, useT } from '../../store/useT'
import { Button } from '../../ui/Button'
import { Field, SelectInput, TextInput } from '../../ui/Field'
import { Segmented } from '../../ui/Segmented'
import styles from './sheets.module.css'

type Mode = 'one' | 'many'

/**
 * New payment: one session or a pass, starting at a chosen unpaid session (the first one by
 * default); empty fields repeat the last payment.
 */
export function AddPayment({
  hobby,
  queue,
  from,
  one = false,
}: {
  hobby: Hobby
  queue: string[]
  /** Preselected first paid session. */
  from?: SessionKey
  one?: boolean
}) {
  const t = useT()
  const lang = useLanguage()
  const now = localClock.now()
  const s = summarize(hobby, now)
  const last = hobby.payments[hobby.payments.length - 1]
  const segment = hobby.sched[hobby.sched.length - 1]

  const [mode, setMode] = useState<Mode>(one ? 'one' : 'many')
  const [startKey, setStartKey] = useState(from)
  const [count, setCount] = useState('')
  const [price, setPrice] = useState('')

  const defaultN = last?.n ?? 1
  const defaultPrice =
    mode === 'one' ? (last && last.n > 0 ? Math.round(last.price / last.n) : 0) : (last?.price ?? 0)
  const n = mode === 'one' ? 1 : count === '' ? defaultN : Number(count)
  const minor = price === '' ? defaultPrice : parsePrice(price)
  const valid = n > 0 && minor !== null
  const unpaid = s.sessions.filter((x) => x.status === 'unpaid' && !x.mark)
  // The chosen session may have been paid meanwhile (e.g. a sync): never start earlier than it.
  const chosen = s.sessions.find((x) => x.key === startKey)
  const start =
    unpaid.find((x) => x.key === startKey) ??
    (chosen ? unpaid.find((x) => x.date >= chosen.date) : undefined) ??
    unpaid[0]
  const at = (x: { date: string; time: string }) => `${formatDate(lang, x.date)}, ${x.time}`

  const next = () => {
    const [id, ...rest] = queue
    const flow = useFlow.getState()
    if (id) flow.open({ kind: 'reminder', hobbyId: id, queue: rest })
    else flow.close()
  }

  const save = () => {
    if (!valid || minor === null) return useToast.getState().show(t.fillAll)
    useApp.getState().updateHobby(hobby.id, (h) =>
      addPayment(h, {
        date: now.slice(0, 10),
        n,
        price: minor,
        ...(start && { from: start.date }),
      }),
    )
    useToast.getState().show(t.tRenewed(n))
    next()
  }

  return (
    <>
      <div className={styles.head}>
        <h2 className={styles.title}>{t.payTitle}</h2>
        <span className={styles.sub}>
          {hobby.name}
          {segment && ` · ${formatSchedule(lang, segment.times, segment.durs)}`}
        </span>
      </div>
      <Segmented
        label={t.payTitle}
        value={mode}
        onChange={setMode}
        options={[
          { value: 'one', label: t.payOne },
          { value: 'many', label: t.payManyL },
        ]}
      />
      <div className={styles.grid2}>
        {mode === 'many' && (
          <Field label={t.rSessions}>
            {(id) => (
              <TextInput
                id={id}
                inputMode="numeric"
                placeholder={String(defaultN)}
                value={count}
                onChange={(e) => setCount(e.target.value.replace(/\D/g, '').slice(0, 3))}
              />
            )}
          </Field>
        )}
        <Field
          label={`${t.payAmount}, ${currencyLabel(lang, hobby.currency)}`}
          className={mode === 'one' ? styles.span2 : undefined}
        >
          {(id) => (
            <TextInput
              id={id}
              inputMode="decimal"
              placeholder={priceInput(defaultPrice)}
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ''))}
            />
          )}
        </Field>
      </div>
      {start && (
        <Field label={t.payFrom}>
          {(id) => (
            <SelectInput id={id} value={start.key} onChange={(e) => setStartKey(e.target.value)}>
              {unpaid.map((x) => (
                <option key={x.key} value={x.key}>
                  {at(x)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      )}
      {start && n > 0 && <p className={styles.hint}>{t.payHint(n, at(start))}</p>}
      <Button variant="primary" block tall onClick={save}>
        {t.paidBtn}
      </Button>
      <Button variant="ghost" block onClick={next}>
        {t.cancel}
      </Button>
    </>
  )
}

import { CalendarBlank, Copy, GoogleDriveLogo, Trash } from '@phosphor-icons/react'
import { useId, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router'
import {
  editSchedule,
  firstSessionDate,
  type Currency,
  type HHMM,
  type Hobby,
  type Weekday,
} from '../../domain'
import { currencyLabel, formatDate, formatMoney } from '../../i18n/format'
import { parsePrice } from '../../i18n/money'
import { useApp } from '../../store/appStore'
import { useAuth } from '../../store/authStore'
import { useNow } from '../../store/clock'
import { announceDeletion } from '../../store/syncStore'
import { useToast } from '../../store/toastStore'
import { useLanguage, useT } from '../../store/useT'
import { Button } from '../../ui/Button'
import { DayChips } from '../../ui/DayChips'
import { DurationField } from '../../ui/DurationField'
import { Field, SelectInput, TextInput } from '../../ui/Field'
import { Sheet } from '../../ui/Sheet'
import { Switch } from '../../ui/Switch'
import styles from './HobbyForm.module.css'

const CURRENCIES: Currency[] = ['UAH', 'USD', 'EUR']
const WEEK: Weekday[] = [0, 1, 2, 3, 4, 5, 6]

type Times = Partial<Record<Weekday, HHMM>>
type Durs = Partial<Record<Weekday, number | null>>

const addDay = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)

const sameRecord = <V,>(a: Partial<Record<Weekday, V>>, b: Partial<Record<Weekday, V>>) =>
  WEEK.every((d) => a[d] === b[d])

/** Create (`/new`) and edit (`/hobby/:id/edit`) share this form. */
export function HobbyForm() {
  const { id } = useParams()
  const hobby = useApp((s) => s.data.hobbies.find((h) => h.id === id))
  const navigate = useNavigate()
  // 'default' = the form is the first entry (cold deep link): there is nothing in-app to go back to.
  const hasHistory = useLocation().key !== 'default'
  if (id && !hobby) return <Navigate to="/" replace />
  const back = hobby ? `/hobby/${hobby.id}` : '/'
  const leave = () => (hasHistory ? navigate(-1) : navigate(back, { replace: true }))
  return (
    <Form
      hobby={hobby}
      // Edit returns to the Detail it came from instead of stacking a second copy of it.
      onDone={(to) => (hobby && to === back ? leave() : navigate(to, { replace: true }))}
      onCancel={leave}
    />
  )
}

function Form({
  hobby,
  onDone,
  onCancel,
}: {
  hobby: Hobby | undefined
  onDone: (to: string) => void
  onCancel: () => void
}) {
  const t = useT()
  const lang = useLanguage()
  const now = useNow()
  const today = now.slice(0, 10)
  const email = useAuth((s) => s.user?.email ?? '')
  const authStatus = useAuth((s) => s.status)
  const [calendarOn, setCalendarOn] = useState(hobby?.google.calendar ?? false)
  const [backupOn, setBackupOn] = useState(hobby?.google.backup ?? false)
  const calId = useId()
  const backupId = useId()
  const googleChosen = calendarOn || backupOn
  // Offline counts as signed in: the session is there, sync waits for the network.
  const signedIn = authStatus === 'signedIn' || authStatus === 'offline'
  const { addHobby, updateHobby, deleteHobby } = useApp.getState()
  const toast = useToast((s) => s.show)
  const edit = Boolean(hobby)
  // The latest segment: editing an older one would silently drop the schedule planned after it.
  const base = hobby?.sched[hobby.sched.length - 1]

  const [name, setName] = useState(hobby?.name ?? '')
  const [times, setTimes] = useState<Times>(base?.times ?? {})
  const [durs, setDurs] = useState<Durs>(base?.durs ?? {})
  const [start, setStart] = useState('')
  const [effective, setEffective] = useState(addDay(today, 1))
  const [sessions, setSessions] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState<Currency>(hobby?.currency ?? 'UAH')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const days = WEEK.filter((d) => times[d] !== undefined)
  const durOf = (d: Weekday) => durs[d] ?? 60

  const changeSchedule = (nextTimes: Times, nextDurs: Durs) => {
    setTimes(nextTimes)
    setDurs(nextDurs)
    // Create: keep "First session" on the nearest upcoming selected weekday.
    if (!edit) setStart(firstSessionDate(filled(nextTimes), now) ?? '')
  }

  const toggleDay = (d: Weekday) => {
    const without = <V,>(r: Partial<Record<Weekday, V>>) =>
      Object.fromEntries(Object.entries(r).filter(([k]) => Number(k) !== d)) as Partial<
        Record<Weekday, V>
      >
    if (times[d] !== undefined) return changeSchedule(without(times), without(durs))
    const nextTimes = { ...times }
    const nextDurs = { ...durs }
    // Edit: a new day starts with the previous day's slot; create: empty.
    const prev = days.filter((x) => x < d).pop() ?? days[0]
    nextTimes[d] = edit && prev !== undefined ? (times[prev] ?? '') : ''
    nextDurs[d] = edit && prev !== undefined ? (durs[prev] ?? null) : null
    changeSchedule(nextTimes, nextDurs)
  }

  const rowsDiffer = days.some(
    (d) => times[d] !== times[days[0] as Weekday] || durOf(d) !== durOf(days[0] as Weekday),
  )
  const applyAll = () => {
    const first = days[0] as Weekday
    changeSchedule(
      Object.fromEntries(days.map((d) => [d, times[first]])) as Times,
      Object.fromEntries(days.map((d) => [d, durs[first] ?? null])) as Durs,
    )
  }

  const n = Number(sessions || 0)
  const minor = parsePrice(price)
  const timesOk = days.length > 0 && days.every((d) => /^\d\d:\d\d$/.test(times[d] ?? ''))
  // Edit: a past (or empty) date would rewrite sessions that already happened.
  const valid = timesOk && (edit ? effective >= today : n > 0 && start !== '' && minor !== null)
  const dtList = days
    .map((d) => `${t.daysF[d]} ${times[d] || '—'} (${durOf(d)} ${t.min})`)
    .join(', ')
  const summary = !days.length
    ? t.pickDay
    : !valid
      ? t.fillAll
      : edit
        ? t.editSummary(dtList, formatDate(lang, effective))
        : t.summary(dtList, n, formatMoney((minor ?? 0) / Math.max(1, n), currency))

  const submit = () => {
    if (!valid) return toast(days.length ? t.fillAll : t.pickDay)
    const cleanDurs = Object.fromEntries(days.map((d) => [d, durOf(d)])) as Partial<
      Record<Weekday, number>
    >
    const google = { calendar: calendarOn, backup: backupOn }
    // The first Google option needs an account: sign in right after saving (back to the hobby).
    const done = (to: string) => {
      onDone(to)
      if (googleChosen && !signedIn) useAuth.getState().signIn()
    }
    if (hobby) {
      const unchanged =
        base !== undefined &&
        sameRecord(filled(times), base.times) &&
        sameRecord(cleanDurs, base.durs)
      updateHobby(hobby.id, (h) => ({
        ...(unchanged ? h : editSchedule(h, effective, filled(times), cleanDurs)),
        name: name.trim() || h.name,
        currency: h.payments.length <= 1 ? currency : h.currency,
        google,
      }))
      return done(`/hobby/${hobby.id}`)
    }
    const created = addHobby({
      id: crypto.randomUUID(),
      name: name.trim() || t.defName,
      start,
      times: filled(times),
      durs: cleanDurs,
      currency,
      sessions: n,
      price: minor ?? 0,
      paymentDate: today,
      google,
    })
    done(`/hobby/${created.id}`)
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <Button variant="ghost" onClick={onCancel}>
          {t.cancel}
        </Button>
        <h1 className={styles.title}>{edit ? t.edit : t.newHobby}</h1>
        <span />
      </header>

      <Field label={t.fName}>
        {(fid) => (
          <TextInput
            id={fid}
            value={name}
            placeholder={t.fNamePh}
            onChange={(e) => setName(e.target.value)}
          />
        )}
      </Field>

      <div className={styles.block}>
        <span className={styles.label}>{t.fDays}</span>
        <DayChips
          label={t.fDays}
          names={t.days}
          selected={new Set(days)}
          onToggle={(d) => toggleDay(d as Weekday)}
        />
        {days.length > 0 && (
          <div className={styles.rows}>
            {days.map((d) => (
              <div key={d} className={styles.dayRow}>
                <span className={styles.dayName}>{t.daysF[d]}</span>
                <TextInput
                  type="time"
                  aria-label={t.daysF[d]}
                  className={styles.time}
                  value={times[d] ?? ''}
                  onChange={(e) => changeSchedule({ ...times, [d]: e.target.value }, durs)}
                />
                <div className={styles.dur}>
                  <DurationField
                    value={durs[d] ?? null}
                    onChange={(m) => changeSchedule(times, { ...durs, [d]: m })}
                    minLabel={t.min}
                    label={`${t.daysF[d]}, ${t.min}`}
                    presetsLabel={t.min}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        {days.length > 1 && rowsDiffer && (
          <Button variant="ghost" icon={<Copy />} className={styles.applyAll} onClick={applyAll}>
            {t.applyAll}
          </Button>
        )}
      </div>

      <Field label={edit ? t.effFrom : t.fStart}>
        {(fid) => (
          <TextInput
            id={fid}
            type="date"
            min={edit ? today : undefined}
            value={edit ? effective : start}
            onChange={(e) => (edit ? setEffective(e.target.value) : setStart(e.target.value))}
          />
        )}
      </Field>

      {!edit && (
        <Field label={t.fPaid} className={styles.half}>
          {(fid) => (
            <TextInput
              id={fid}
              inputMode="numeric"
              placeholder="8"
              value={sessions}
              onChange={(e) => setSessions(e.target.value.replace(/\D/g, '').slice(0, 3))}
            />
          )}
        </Field>
      )}

      {(!edit || (hobby?.payments.length ?? 0) <= 1) && (
        <div className={edit ? undefined : styles.priceRow}>
          {!edit && (
            <Field label={t.fPrice}>
              {(fid) => (
                <TextInput
                  id={fid}
                  inputMode="decimal"
                  placeholder="8000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ''))}
                />
              )}
            </Field>
          )}
          <Field label={edit ? t.fCurrency : '\u00a0'} className={styles.currency}>
            {(fid) => (
              <SelectInput
                id={fid}
                // Create shows a blank label (aligned with the price field) — name it for AT.
                aria-label={edit ? undefined : t.fCurrency}
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {currencyLabel(lang, c)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
        </div>
      )}

      <div className={styles.options}>
        <div className={styles.option}>
          <CalendarBlank className={styles.optionIcon} aria-hidden="true" />
          <span className={styles.optionText} id={calId}>
            {t.optCalendar}
            <span className={styles.optionSub}>
              {signedIn && email ? t.calInfo(email) : t.googleSignInNeeded}
            </span>
          </span>
          <Switch checked={calendarOn} onChange={setCalendarOn} labelledBy={calId} />
        </div>
        <div className={styles.option}>
          <GoogleDriveLogo className={styles.optionIcon} aria-hidden="true" />
          <span className={styles.optionText} id={backupId}>
            {t.optBackup}
            <span className={styles.optionSub}>{t.optBackupSub}</span>
          </span>
          <Switch checked={backupOn} onChange={setBackupOn} labelledBy={backupId} />
        </div>
      </div>

      <p className={styles.summary} aria-live="polite">
        {summary}
      </p>

      <Button variant="primary" block onClick={submit}>
        {edit ? t.save : calendarOn ? t.createBtn : t.createLocal}
      </Button>
      {hobby && (
        <Button variant="ghost" block icon={<Trash />} onClick={() => setConfirmDelete(true)}>
          {t.del}
        </Button>
      )}

      {hobby && (
        <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} label={t.delTitle}>
          <h2 className={styles.sheetTitle}>{t.delTitle}</h2>
          <p className={styles.sheetBody}>{t.delBody}</p>
          <Button
            variant="primary"
            block
            icon={<Trash />}
            onClick={() => {
              // Confirm the calendar cleanup only where there was a calendar to clean.
              if (hobby.google.calendar) announceDeletion(hobby.id)
              deleteHobby(hobby.id)
              toast(t.tDeleted)
              onDone('/')
            }}
          >
            {t.wipeBtn}
          </Button>
          <Button variant="ghost" block onClick={() => setConfirmDelete(false)}>
            {t.cancel}
          </Button>
        </Sheet>
      )}
    </div>
  )
}

/** Drops days whose time is still empty. */
const filled = (times: Times): Partial<Record<Weekday, HHMM>> =>
  Object.fromEntries(Object.entries(times).filter(([, v]) => v)) as Partial<Record<Weekday, HHMM>>

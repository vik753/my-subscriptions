import { useId, useState } from 'react'
import { moveAllFollowing, moveSession, weekdayOf, type Hobby, type Session } from '../../domain'
import { formatDate, formatMonthYear } from '../../i18n/format'
import { useApp } from '../../store/appStore'
import { localClock } from '../../store/clock'
import { useFlow } from '../../store/flowStore'
import { useToast } from '../../store/toastStore'
import { useLanguage, useT } from '../../store/useT'
import { Button } from '../../ui/Button'
import { shiftMonth } from '../../ui/calendarGrid'
import { TextInput } from '../../ui/Field'
import { MonthCalendar, PickDayCell } from '../../ui/MonthCalendar'
import { Switch } from '../../ui/Switch'
import styles from './sheets.module.css'

/** Move a session to another day and time, optionally with all following ones on its weekday. */
export function MovePicker({
  hobby,
  session,
  sessions,
  onBack,
}: {
  hobby: Hobby
  session: Session
  sessions: Session[]
  onBack: () => void
}) {
  const t = useT()
  const lang = useLanguage()
  const today = localClock.now().slice(0, 10)
  const [date, setDate] = useState<string | null>(null)
  const [time, setTime] = useState(session.time)
  const [all, setAll] = useState(false)
  const [view, setView] = useState<[number, number]>([
    Number(session.date.slice(0, 4)),
    Number(session.date.slice(5, 7)) - 1,
  ])
  const allId = useId()

  // Days that already have a session (other than this one) get a dot.
  const busy = new Set(
    sessions
      .filter((x) => x.key !== session.key && x.mark !== 'cancelled' && x.mark !== 'missed')
      .map((x) => x.date),
  )
  const from = session.movedFrom ?? { date: session.date, time: session.time }
  const allSub = `${t.daysS[weekdayOf(from.date)]} ${from.time} → ${
    date ? t.daysS[weekdayOf(date)] : '—'
  } ${time}`

  const save = () => {
    if (!date || !/^\d\d:\d\d$/.test(time)) return
    const to = { date, time }
    useApp
      .getState()
      .updateHobby(hobby.id, (h) =>
        all ? moveAllFollowing(h, session.key, to) : moveSession(h, session.key, to),
      )
    useFlow.getState().close()
    useToast
      .getState()
      .show(
        all
          ? t.tMovedAll(
              `${t.daysS[weekdayOf(from.date)]} ${from.time}`,
              `${t.daysS[weekdayOf(date)]} ${time}`,
            )
          : t.tMovedTo(`${formatDate(lang, date)}, ${time}`),
      )
  }

  return (
    <>
      <div className={styles.moveBlock}>
        <MonthCalendar
          year={view[0]}
          monthIndex={view[1]}
          title={formatMonthYear(lang, view[0], view[1])}
          weekdayNames={t.days}
          prevLabel={formatMonthYear(lang, ...shiftMonth(view[0], view[1], -1))}
          nextLabel={formatMonthYear(lang, ...shiftMonth(view[0], view[1], 1))}
          onPrev={() => setView(shiftMonth(view[0], view[1], -1))}
          onNext={() => setView(shiftMonth(view[0], view[1], 1))}
          gap={2}
          renderDay={(d) => (
            <PickDayCell
              day={d.day}
              inMonth={d.inMonth}
              today={d.date === today}
              selected={d.date === date}
              disabled={d.date < today}
              hasSession={busy.has(d.date)}
              label={formatDate(lang, d.date)}
              onClick={() => setDate(d.date)}
            />
          )}
        />
      </div>
      <div className={styles.moveWhen}>
        <span>{date ? formatDate(lang, date) : t.newDate}</span>
        <TextInput
          type="time"
          aria-label={t.newDate}
          className={styles.moveTime}
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>
      <div className={styles.switchRow}>
        <span className={styles.switchText} id={allId}>
          {t.moveAll}
          <span className={styles.switchSub}>{allSub}</span>
        </span>
        <Switch checked={all} onChange={setAll} labelledBy={allId} />
      </div>
      <Button variant="primary" block tall disabled={!date || !time} onClick={save}>
        {t.saveMove}
      </Button>
      <Button variant="ghost" block onClick={onBack}>
        {t.back}
      </Button>
    </>
  )
}

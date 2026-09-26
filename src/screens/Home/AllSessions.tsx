import { CaretRight } from '@phosphor-icons/react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { summarize, type Hobby, type LocalDateTime, type Session } from '../../domain'
import type { Messages } from '../../i18n'
import { formatDateLong, formatMonthYear } from '../../i18n/format'
import { useLanguage, useT } from '../../store/useT'
import { shiftMonth } from '../../ui/calendarGrid'
import { DotDayCell, MonthCalendar, type DotStatus } from '../../ui/MonthCalendar'
import { StatusPill, type SessionPillStatus } from '../../ui/Tag'
import styles from './AllSessions.module.css'

interface Item {
  hobby: Hobby
  session: Session
}

const pillOf = (s: Session): SessionPillStatus =>
  s.pending
    ? 'pending'
    : s.mark === 'attended'
      ? 'attended'
      : s.mark === 'forfeit'
        ? 'forfeit'
        : s.mark
          ? 'cancelled'
          : s.status === 'paid'
            ? 'paid'
            : 'unpaid'

const pillLabel = (t: Messages, status: SessionPillStatus): string =>
  ({
    pending: t.legendPending,
    attended: t.attended,
    forfeit: t.forfeitTag,
    cancelled: t.cancelledTag,
    paid: t.paid,
    unpaid: t.unpaid,
  })[status]

/** The one dot of a day: pending → first unmarked → attended → cancelled. */
const dotOf = (items: Item[]): DotStatus | undefined => {
  const pick =
    items.find((x) => x.session.pending) ??
    items.find((x) => !x.session.mark) ??
    items.find((x) => x.session.mark === 'attended' || x.session.mark === 'forfeit') ??
    items[0]
  if (!pick) return undefined
  const pill = pillOf(pick.session)
  return pill === 'forfeit' ? 'attended' : pill
}

/** "All sessions" tab: every session of every hobby on one month grid. */
export function AllSessions({
  hobbies,
  now,
  day,
  onDay,
}: {
  hobbies: Hobby[]
  now: LocalDateTime
  /** Selected day (kept by the caller so Back from a hobby returns to it). */
  day: string
  onDay: (date: string) => void
}) {
  const t = useT()
  const lang = useLanguage()
  const navigate = useNavigate()
  const today = now.slice(0, 10)
  const [view, setView] = useState<[number, number]>([
    Number(day.slice(0, 4)),
    Number(day.slice(5, 7)) - 1,
  ])

  const byDay = new Map<string, Item[]>()
  for (const hobby of hobbies)
    for (const session of summarize(hobby, now).sessions) {
      const list = byDay.get(session.date) ?? []
      list.push({ hobby, session })
      byDay.set(session.date, list)
    }
  for (const list of byDay.values())
    list.sort((a, b) => a.session.time.localeCompare(b.session.time))
  const selected = byDay.get(day) ?? []

  return (
    <div className={styles.all}>
      <MonthCalendar
        year={view[0]}
        monthIndex={view[1]}
        title={formatMonthYear(lang, view[0], view[1])}
        weekdayNames={t.days}
        prevLabel={formatMonthYear(lang, ...shiftMonth(view[0], view[1], -1))}
        nextLabel={formatMonthYear(lang, ...shiftMonth(view[0], view[1], 1))}
        onPrev={() => setView(shiftMonth(view[0], view[1], -1))}
        onNext={() => setView(shiftMonth(view[0], view[1], 1))}
        renderDay={(d) => {
          const items = byDay.get(d.date) ?? []
          return (
            <DotDayCell
              day={d.day}
              inMonth={d.inMonth}
              today={d.date === today}
              selected={d.date === day}
              dot={dotOf(items)}
              count={items.length}
              label={
                items.length
                  ? `${formatDateLong(lang, d.date)}, ${t.payN(items.length)}`
                  : formatDateLong(lang, d.date)
              }
              onClick={() => {
                onDay(d.date)
                if (!d.inMonth)
                  setView([Number(d.date.slice(0, 4)), Number(d.date.slice(5, 7)) - 1])
              }}
            />
          )
        }}
      />

      <ul className={styles.legend}>
        <li className={styles.lgPaid}>{t.paid}</li>
        <li className={styles.lgUnpaid}>{t.unpaid}</li>
        <li className={styles.lgAttended}>{t.attended}</li>
        <li className={styles.lgPending}>{t.legendPending}</li>
        <li className={styles.lgCancelled}>{t.missed}</li>
      </ul>

      <section className={styles.day}>
        <h2 className={styles.dayTitle}>{formatDateLong(lang, day)}</h2>
        {selected.length === 0 ? (
          <p className={styles.empty}>{t.noSessionsDay}</p>
        ) : (
          <ul className={styles.list}>
            {selected.map(({ hobby, session }) => {
              const pill = pillOf(session)
              return (
                <li key={`${hobby.id}|${session.key}`}>
                  <button
                    type="button"
                    className={styles.row}
                    onClick={() =>
                      navigate(`/hobby/${hobby.id}`, { state: { month: session.date.slice(0, 7) } })
                    }
                  >
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle}>{hobby.name}</span>
                      <span className={styles.rowSub}>
                        {session.time} · {session.dur} {t.min}
                        {session.movedFrom && ` · ${t.movedShort}`}
                      </span>
                    </span>
                    <StatusPill status={pill}>{pillLabel(t, pill)}</StatusPill>
                    <CaretRight size={14} className={styles.chevron} aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

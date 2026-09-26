import {
  CaretLeft,
  DeviceMobile,
  CaretRight,
  ClockCountdown,
  PencilSimple,
  Plus,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { segmentAt, summarize, type Hobby, type Session, type SessionStatus } from '../../domain'
import type { Messages } from '../../i18n'
import { formatDate, formatMoney, formatMonthYear, formatScheduleGroups } from '../../i18n/format'
import { useApp } from '../../store/appStore'
import { useAuth } from '../../store/authStore'
import { openPendingFlow, useFlow, type FlowSheet } from '../../store/flowStore'
import { useNow } from '../../store/clock'
import { useSyncState } from '../../store/syncState'
import { useLanguage, useT } from '../../store/useT'
import { Button, IconButton } from '../../ui/Button'
import { shiftMonth } from '../../ui/calendarGrid'
import { Groups } from '../../ui/Groups'
import { MonthCalendar, SessionDayCell, type SessionCellStatus } from '../../ui/MonthCalendar'
import { StatusPill } from '../../ui/Tag'
import { SyncStatus } from '../../ui/SyncStatus'
import styles from './HobbyDetail.module.css'

const UPCOMING = 12

export function HobbyDetail() {
  const { id } = useParams()
  const hobby = useApp((s) => s.data.hobbies.find((h) => h.id === id))
  return hobby ? <Detail hobby={hobby} /> : <Navigate to="/" replace />
}

const cellStatus = (s: Session): SessionCellStatus => (s.pending ? 'pending' : s.status)

const statusLabel = (t: Messages, s: Session): string =>
  s.pending
    ? t.legendPending
    : (
        {
          paid: t.paid,
          unpaid: t.unpaid,
          attended: t.attended,
          missed: t.missed,
          forfeit: t.forfeitTag,
        } satisfies Record<SessionStatus, string>
      )[s.status]

const historyLabel = (t: Messages, s: Session): string =>
  s.mark === 'attended'
    ? t.attended
    : s.mark === 'cancelled'
      ? t.histCancelled
      : s.mark === 'forfeit'
        ? t.histForfeit
        : t.histMissed

function Detail({ hobby }: { hobby: Hobby }) {
  const t = useT()
  const lang = useLanguage()
  const now = useNow()
  const today = now.slice(0, 10)
  const navigate = useNavigate()
  const sync = useSyncState()
  const signIn = useAuth((s) => s.signIn)
  const s = summarize(hobby, now)
  const open = useFlow((f) => f.open)
  // Pending → Attendance prompt; unmarked or cancelled → Session sheet; attended / missed are final.
  const sheetFor = (x: Session): FlowSheet | null =>
    x.pending
      ? { kind: 'prompt', hobbyId: hobby.id, key: x.key }
      : !x.mark || x.mark === 'cancelled' || x.mark === 'forfeit'
        ? { kind: 'session', hobbyId: hobby.id, key: x.key }
        : null
  const segment = segmentAt(hobby.sched, today) ?? hobby.sched[hobby.sched.length - 1]

  // Opened from "All sessions": show the month of the tapped session.
  const location = useLocation()
  const month = (location.state as { month?: string } | null)?.month
  const first = month ? `${month}-01` : (s.next?.date ?? today)
  const [view, setView] = useState<[number, number]>([
    Number(first.slice(0, 4)),
    Number(first.slice(5, 7)) - 1,
  ])
  const byDate = new Map<string, Session>()
  for (const x of s.sessions) if (!byDate.has(x.date)) byDate.set(x.date, x)

  const upcoming = s.sessions.filter((x) => !x.mark && !x.pending).slice(0, UPCOMING)
  const history = s.sessions.filter((x) => x.mark).reverse()
  // Never signed in on this device: "Sign in again" would be odd — say a sign-in is needed.
  const known = useAuth((a) => a.known)
  const syncLabel = {
    ok: t.syncedL,
    syncing: t.syncing,
    offline: t.offline,
    reauth: known ? t.reauth : t.googleSignInNeeded,
  }[sync]

  return (
    <div className={styles.screen}>
      <header className={styles.topBar}>
        <Button
          variant="ghost"
          icon={<CaretLeft />}
          onClick={() => (location.key === 'default' ? navigate('/') : navigate(-1))}
        >
          {t.title}
        </Button>
        <IconButton
          size="small"
          label={t.edit}
          icon={<PencilSimple />}
          onClick={() => navigate(`/hobby/${hobby.id}/edit`)}
        />
      </header>

      <div className={styles.head}>
        <h1 className={styles.title}>{hobby.name}</h1>
        {segment && (
          <p className={styles.schedule}>
            <Groups parts={formatScheduleGroups(lang, segment.times, segment.durs)} />
          </p>
        )}
        {hobby.google.calendar || hobby.google.backup ? (
          <SyncStatus state={sync} label={syncLabel} actionLabel={t.reauthBtn} onAction={signIn} />
        ) : (
          <p className={styles.localOnly}>
            <DeviceMobile size={16} aria-hidden="true" />
            {t.localOnly}
          </p>
        )}
      </div>

      <Button
        variant="primary"
        block
        icon={<Plus />}
        onClick={() => open({ kind: 'payment', hobbyId: hobby.id, queue: [] })}
      >
        {t.addPayment}
      </Button>

      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt>{t.statLeft}</dt>
          <dd className={styles.paidValue}>{s.remaining}</dd>
        </div>
        <div className={styles.stat}>
          <dt>{t.statAttended}</dt>
          <dd>{s.attended}</dd>
        </div>
        <div className={styles.stat}>
          <dt>{t.statPer}</dt>
          <dd>
            {s.pricePerSession === null ? '—' : formatMoney(s.pricePerSession, hobby.currency)}
          </dd>
        </div>
      </dl>

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
          const x = byDate.get(d.date)
          return (
            <SessionDayCell
              day={d.day}
              inMonth={d.inMonth}
              today={d.date === today}
              {...(x && {
                time: x.time,
                status: cellStatus(x),
                label: `${formatDate(lang, x.date)}, ${x.time} — ${statusLabel(t, x)}`,
                ...(sheetFor(x) && { onClick: () => open(sheetFor(x) as FlowSheet) }),
              })}
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

      {s.pending.length > 0 && (
        <button
          type="button"
          className={styles.pendingRow}
          onClick={() => openPendingFlow(hobby.id)}
        >
          <ClockCountdown size={18} aria-hidden="true" />
          <span>{t.pendingRow(s.pending.length)}</span>
          <CaretRight size={14} aria-hidden="true" />
        </button>
      )}

      <section className={styles.section}>
        <h2 className={styles.h2}>{t.upcoming}</h2>
        <ul className={styles.list}>
          {upcoming.map((x) => (
            <li key={x.key}>
              <button
                type="button"
                className={`${styles.row} ${styles.rowButton}`}
                onClick={() => open({ kind: 'session', hobbyId: hobby.id, key: x.key })}
              >
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{formatDate(lang, x.date)}</span>
                  <span className={styles.rowSub}>
                    {x.time} · {x.dur} {t.min}
                    {x.movedFrom && ` · ${t.movedShort}`}
                  </span>
                </span>
                <StatusPill status={x.status === 'paid' ? 'paid' : 'unpaid'}>
                  {statusLabel(t, x)}
                </StatusPill>
                <CaretRight size={14} className={styles.chevron} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {history.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.h2}>{t.history}</h2>
          <ul className={styles.list}>
            {history.map((x) => (
              <li key={x.key} className={styles.row}>
                <span className={styles.rowTitle}>
                  {formatDate(lang, x.date)}, {x.time}
                </span>
                <span className={styles.rowMeta}>{historyLabel(t, x)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.h2}>{t.payments}</h2>
        <ul className={styles.list}>
          {[...hobby.payments].reverse().map((p, i) => (
            <li key={`${p.date}-${i}`} className={styles.row}>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>{formatDate(lang, p.date)}</span>
                <span className={styles.rowSub}>{t.payN(p.n)}</span>
              </span>
              <span className={styles.rowMeta}>{formatMoney(p.price, hobby.currency)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

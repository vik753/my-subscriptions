import { addDays, addMinutes, maxDate, splitDateTime, weekdayOf } from './dates'
import { activeWeekdays, segmentAt } from './schedule'
import type {
  Hobby,
  HobbySummary,
  ISODate,
  LocalDateTime,
  PendingItem,
  Session,
  SessionKey,
} from './types'

const MIN_WEEKS_AHEAD = 12

/** Last date (exclusive) to generate sessions for. */
const generationEnd = (hobby: Hobby, paidTotal: number, today: ISODate): ISODate => {
  // A payment starting far ahead still needs its sessions generated.
  const base = hobby.payments.reduce((d, p) => (p.from ? maxDate(d, p.from) : d), hobby.start)
  const lastSegment = hobby.sched[hobby.sched.length - 1]
  const perWeek = Math.max(1, lastSegment ? activeWeekdays(lastSegment.times).length : 1)
  const notAttended = Object.values(hobby.marks).filter((m) => m !== 'attended').length
  const weeksFromStart =
    Math.max(MIN_WEEKS_AHEAD, Math.ceil((paidTotal + notAttended) / perWeek) + 4) +
    hobby.sched.length * 2
  return maxDate(addDays(base, weeksFromStart * 7), addDays(today, MIN_WEEKS_AHEAD * 7 + 1))
}

const generate = (hobby: Hobby, end: ISODate): Omit<Session, 'status' | 'pending'>[] => {
  const out: Omit<Session, 'status' | 'pending'>[] = []
  for (let date = hobby.start; date < end; date = addDays(date, 1)) {
    const segment = segmentAt(hobby.sched, date)
    if (!segment) continue
    const weekday = weekdayOf(date)
    const time = segment.times[weekday]
    if (time == null) continue
    const base = { key: date, date, time, dur: segment.durs[weekday] ?? 60 }
    const move = hobby.moves[date]
    const mark = hobby.marks[date]
    out.push({
      ...base,
      ...(move && { date: move.date, time: move.time, movedFrom: { date, time } }),
      ...(mark && { mark }),
    })
  }
  return out.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.key.localeCompare(b.key),
  )
}

/**
 * The chronological walk that assigns paid slots (decisions 16, 18). Slots become available when
 * the walk reaches a payment's `from` (older payments: at once); each consuming session takes one
 * from the earliest-available payment that still has one. `payer`: session key → payment index.
 */
const walk = (hobby: Hobby, now: LocalDateTime) => {
  const paidTotal = hobby.payments.reduce((sum, p) => sum + p.n, 0)
  const { date: today } = splitDateTime(now)
  const slots = hobby.payments.map((p, index) => ({ index, from: p.from, left: p.n }))
  const open = slots.filter((p) => p.from === undefined)
  const anchored = slots
    .flatMap((p) => (p.from === undefined ? [] : [{ ...p, from: p.from }]))
    .sort((a, b) => a.from.localeCompare(b.from) || a.index - b.index)
  const payer = new Map<SessionKey, number>()
  let usedByMarked = 0

  const take = (date: ISODate): number | null => {
    for (let first = anchored[0]; first && first.from <= date; first = anchored[0]) {
      open.push(first)
      anchored.shift()
    }
    for (let head = open[0]; head; head = open[0]) {
      if (head.left > 0) {
        head.left--
        return head.index
      }
      open.shift()
    }
    return null
  }

  const sessions: Session[] = generate(hobby, generationEnd(hobby, paidTotal, today)).map((s) => {
    const pending = !s.mark && addMinutes(s.date, s.time, s.dur) < now
    if (s.mark === 'missed' || s.mark === 'cancelled') return { ...s, status: 'missed', pending }
    const index = take(s.date)
    if (index !== null) {
      payer.set(s.key, index)
      if (s.mark) usedByMarked++
    }
    if (s.mark === 'forfeit') return { ...s, status: 'forfeit', pending }
    if (s.mark === 'attended') return { ...s, status: 'attended', pending }
    return { ...s, status: index !== null ? 'paid' : 'unpaid', pending }
  })
  return { sessions, payer, paidTotal, usedByMarked }
}

export const summarize = (hobby: Hobby, now: LocalDateTime): HobbySummary => {
  const { sessions, payer, paidTotal, usedByMarked } = walk(hobby, now)
  const priceTotal = hobby.payments.reduce((sum, p) => sum + p.price, 0)
  const attended = sessions.filter((s) => s.mark === 'attended').length
  const last = hobby.payments[hobby.payments.length - 1]

  return {
    sessions,
    paidTotal,
    priceTotal,
    attended,
    remaining: paidTotal - usedByMarked,
    pricePerSession: last && last.n > 0 ? Math.round(last.price / last.n) : null,
    next: sessions.find((s) => !s.mark && !s.pending) ?? null,
    pending: sessions.filter((s) => s.pending),
    payable: sessions.filter((s) => s.status !== 'missed' && !payer.has(s.key)),
  }
}

/** Index (in `hobby.payments`) of the payment whose slot the session holds; null if none. */
export const sessionPayment = (hobby: Hobby, key: SessionKey, now: LocalDateTime): number | null =>
  walk(hobby, now).payer.get(key) ?? null

/** Pending sessions of all hobbies, oldest first by start (the order payments are assigned in). */
export const collectPending = (hobbies: readonly Hobby[], now: LocalDateTime): PendingItem[] =>
  hobbies
    .flatMap((hobby, order) =>
      summarize(hobby, now).pending.map((session) => ({ hobbyId: hobby.id, session, order })),
    )
    .sort(
      (a, b) =>
        a.session.date.localeCompare(b.session.date) ||
        a.session.time.localeCompare(b.session.time) ||
        a.order - b.order ||
        a.session.key.localeCompare(b.session.key),
    )
    .map(({ hobbyId, session }) => ({ hobbyId, session }))

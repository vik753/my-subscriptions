import { addDays, addMinutes, maxDate, splitDateTime, weekdayOf } from './dates'
import { activeWeekdays, segmentAt } from './schedule'
import type { Hobby, HobbySummary, ISODate, LocalDateTime, PendingItem, Session } from './types'

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

export const summarize = (hobby: Hobby, now: LocalDateTime): HobbySummary => {
  const paidTotal = hobby.payments.reduce((sum, p) => sum + p.n, 0)
  const priceTotal = hobby.payments.reduce((sum, p) => sum + p.price, 0)
  const { date: today } = splitDateTime(now)

  // Slots become available when the walk reaches a payment's `from` (older payments: at once);
  // each consuming session takes one if any is available.
  const anchored = hobby.payments
    .flatMap((p) => (p.from === undefined ? [] : [{ from: p.from, n: p.n }]))
    .sort((a, b) => a.from.localeCompare(b.from))
  let available = hobby.payments.reduce((sum, p) => (p.from === undefined ? sum + p.n : sum), 0)
  let usedByMarked = 0
  const take = (date: ISODate): boolean => {
    for (let first = anchored[0]; first && first.from <= date; first = anchored[0]) {
      available += first.n
      anchored.shift()
    }
    if (available <= 0) return false
    available--
    return true
  }

  const sessions: Session[] = generate(hobby, generationEnd(hobby, paidTotal, today)).map((s) => {
    const pending = !s.mark && addMinutes(s.date, s.time, s.dur) < now
    if (s.mark === 'missed' || s.mark === 'cancelled') return { ...s, status: 'missed', pending }
    const paid = take(s.date)
    if (paid && s.mark) usedByMarked++
    if (s.mark === 'forfeit') return { ...s, status: 'forfeit', pending }
    if (s.mark === 'attended') return { ...s, status: 'attended', pending }
    return { ...s, status: paid ? 'paid' : 'unpaid', pending }
  })

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
  }
}

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

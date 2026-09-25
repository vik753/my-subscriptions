import { addDays, addMinutes, maxDate, splitDateTime, weekdayOf } from './dates'
import { activeWeekdays, segmentAt } from './schedule'
import type { Hobby, HobbySummary, ISODate, LocalDateTime, PendingItem, Session } from './types'

const MIN_WEEKS_AHEAD = 12

/** Last date (exclusive) to generate sessions for. */
const generationEnd = (hobby: Hobby, paidTotal: number, today: ISODate): ISODate => {
  const lastSegment = hobby.sched[hobby.sched.length - 1]
  const perWeek = Math.max(1, lastSegment ? activeWeekdays(lastSegment.times).length : 1)
  const notAttended = Object.values(hobby.marks).filter((m) => m !== 'attended').length
  const weeksFromStart =
    Math.max(MIN_WEEKS_AHEAD, Math.ceil((paidTotal + notAttended) / perWeek) + 4) +
    hobby.sched.length * 2
  return maxDate(addDays(hobby.start, weeksFromStart * 7), addDays(today, MIN_WEEKS_AHEAD * 7 + 1))
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

  let used = 0
  const sessions: Session[] = generate(hobby, generationEnd(hobby, paidTotal, today)).map((s) => {
    const pending = !s.mark && addMinutes(s.date, s.time, s.dur) < now
    if (s.mark === 'missed' || s.mark === 'cancelled') return { ...s, status: 'missed', pending }
    if (s.mark === 'forfeit') {
      if (used < paidTotal) used++
      return { ...s, status: 'forfeit', pending }
    }
    if (used < paidTotal) {
      used++
      return { ...s, status: s.mark === 'attended' ? 'attended' : 'paid', pending }
    }
    return { ...s, status: s.mark === 'attended' ? 'attended' : 'unpaid', pending }
  })

  const attended = sessions.filter((s) => s.mark === 'attended').length
  const forfeit = sessions.filter((s) => s.mark === 'forfeit').length
  const last = hobby.payments[hobby.payments.length - 1]

  return {
    sessions,
    paidTotal,
    priceTotal,
    attended,
    remaining: Math.max(0, paidTotal - attended - forfeit),
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

import { minDate, weekdayOf } from './dates'
import { segmentAt } from './schedule'
import { summarize } from './sessions'
import type {
  HHMM,
  Hobby,
  ISODate,
  LocalDateTime,
  Mark,
  Move,
  NewHobbyInput,
  Payment,
  ScheduleSegment,
  SessionKey,
  Weekday,
} from './types'

// All mutations are pure and leave `updatedAt` to the store.

const omit = <K extends PropertyKey, V>(
  record: Partial<Record<K, V>>,
  key: K,
): Partial<Record<K, V>> =>
  Object.fromEntries(Object.entries(record).filter(([k]) => k !== String(key))) as Partial<
    Record<K, V>
  >

export const createHobby = (input: NewHobbyInput): Hobby => ({
  id: input.id,
  name: input.name,
  start: input.start,
  sched: [{ from: input.start, times: { ...input.times }, durs: { ...input.durs } }],
  payments: [{ date: input.paymentDate, n: input.sessions, price: input.price }],
  currency: input.currency,
  marks: {},
  moves: {},
  updatedAt: input.updatedAt,
  google: { calendar: false, backup: false, ...input.google },
})

export const addPayment = (hobby: Hobby, payment: Payment): Hobby => ({
  ...hobby,
  payments: [...hobby.payments, { ...payment }],
})

export const markSession = (hobby: Hobby, key: SessionKey, mark: Mark): Hobby => ({
  ...hobby,
  marks: { ...hobby.marks, [key]: mark },
})

export const restoreSession = (hobby: Hobby, key: SessionKey): Hobby => ({
  ...hobby,
  marks: omit(hobby.marks, key) as Record<SessionKey, Mark>,
})

export const cancelSession = (
  hobby: Hobby,
  key: SessionKey,
  carryPayment: boolean,
  now: LocalDateTime,
): Hobby => {
  const session = summarize(hobby, now).sessions.find((s) => s.key === key)
  const forfeit = session?.status === 'paid' && !carryPayment
  return markSession(hobby, key, forfeit ? 'forfeit' : 'cancelled')
}

export const moveSession = (hobby: Hobby, key: SessionKey, to: Move): Hobby => {
  const moves = omit(hobby.moves, key) as Record<SessionKey, Move>
  const segment = segmentAt(hobby.sched, key)
  const originalTime = segment?.times[weekdayOf(key)]
  const isOriginal = to.date === key && to.time === originalTime
  return { ...hobby, moves: isOriginal ? moves : { ...moves, [key]: { ...to } } }
}

const withSegment = (hobby: Hobby, segment: ScheduleSegment): Hobby => ({
  ...hobby,
  sched: [...hobby.sched.filter((s) => s.from < segment.from), segment],
})

export const moveAllFollowing = (hobby: Hobby, key: SessionKey, to: Move): Hobby => {
  const base = segmentAt(hobby.sched, key)
  const oldDay = weekdayOf(key)
  if (!base || base.times[oldDay] == null) return hobby

  const from = minDate(key, to.date)
  const newDay = weekdayOf(to.date)
  const times = { ...omit(base.times, oldDay), [newDay]: to.time }
  const durs = { ...omit(base.durs, oldDay), [newDay]: base.durs[oldDay] ?? 60 }
  const moves = omit(hobby.moves, key) as Record<SessionKey, Move>
  return withSegment({ ...hobby, moves }, { from, times, durs })
}

export const editSchedule = (
  hobby: Hobby,
  from: ISODate,
  times: Partial<Record<Weekday, HHMM>>,
  durs: Partial<Record<Weekday, number>>,
): Hobby => withSegment(hobby, { from, times: { ...times }, durs: { ...durs } })

/** 'YYYY-MM-DD', local calendar date. */
export type ISODate = string
/** 'HH:MM', 24h local time. */
export type HHMM = string
/** 'YYYY-MM-DDTHH:MM', local date-time (no timezone). */
export type LocalDateTime = string

/** 0 = Monday … 6 = Sunday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type Currency = 'UAH' | 'USD' | 'EUR'

/** Schedule version: applies from `from` (inclusive) until the next segment. */
export interface ScheduleSegment {
  from: ISODate
  times: Partial<Record<Weekday, HHMM>>
  /** Duration in minutes per weekday. */
  durs: Partial<Record<Weekday, number>>
}

/** `n` sessions bought for `price` (minor units: kopecks / cents). */
export interface Payment {
  date: ISODate
  n: number
  price: number
}

/**
 * attended  — went; consumes a paid slot.
 * missed    — "didn't happen"; payment carries over.
 * cancelled — cancelled in advance; payment carries over.
 * forfeit   — cancelled without carrying the payment over; consumes a paid slot.
 */
export type Mark = 'attended' | 'missed' | 'cancelled' | 'forfeit'

export interface Move {
  date: ISODate
  time: HHMM
}

/** Session key = the originally generated date; stable when the session is moved. */
export type SessionKey = ISODate

export interface Hobby {
  id: string
  name: string
  /** First session date. */
  start: ISODate
  /** Sorted by `from` ascending. */
  sched: ScheduleSegment[]
  payments: Payment[]
  currency: Currency
  marks: Record<SessionKey, Mark>
  moves: Record<SessionKey, Move>
  /** ISO timestamp, stamped by the store on every change (used for sync merge). */
  updatedAt: string
}

/** `missed` covers both `missed` and `cancelled` marks. */
export type SessionStatus = 'paid' | 'unpaid' | 'attended' | 'forfeit' | 'missed'

export interface Session {
  key: SessionKey
  /** Actual date/time (after a one-off move). */
  date: ISODate
  time: HHMM
  /** Minutes. */
  dur: number
  /** Present when the session was moved with a one-off move. */
  movedFrom?: Move
  mark?: Mark
  status: SessionStatus
  /** No mark and its end (start + dur) is before `now`. */
  pending: boolean
}

export interface HobbySummary {
  /** All generated sessions, chronological (date, time, then key). */
  sessions: Session[]
  /** Sum of `payments[].n`. */
  paidTotal: number
  /** Sum of `payments[].price` (minor units). */
  priceTotal: number
  /** Number of sessions marked `attended`. */
  attended: number
  /** max(0, paidTotal − attended − forfeit). */
  remaining: number
  /** Last payment price / n, rounded to a whole minor unit; null without payments. */
  pricePerSession: number | null
  /** First session with no mark that is not pending; null if none. */
  next: Session | null
  /** Pending sessions, chronological. */
  pending: Session[]
}

export interface PendingItem {
  hobbyId: string
  session: Session
}

export interface NewHobbyInput {
  id: string
  name: string
  start: ISODate
  times: Partial<Record<Weekday, HHMM>>
  durs: Partial<Record<Weekday, number>>
  currency: Currency
  /** Sessions in the first pass. */
  sessions: number
  /** Price of the first pass, minor units. */
  price: number
  paymentDate: ISODate
  updatedAt: string
}

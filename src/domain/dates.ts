import type { HHMM, ISODate, LocalDateTime, Weekday } from './types'

// All date math goes through UTC so local DST transitions never shift calendar dates.
const toUTC = (date: ISODate): number => {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return Date.UTC(y, m - 1, d)
}

const fromUTC = (ms: number): ISODate => new Date(ms).toISOString().slice(0, 10)

const DAY_MS = 86_400_000

export const addDays = (date: ISODate, days: number): ISODate =>
  fromUTC(toUTC(date) + days * DAY_MS)

/** 0 = Monday … 6 = Sunday. */
export const weekdayOf = (date: ISODate): Weekday =>
  ((new Date(toUTC(date)).getUTCDay() + 6) % 7) as Weekday

export const toMinutes = (time: HHMM): number => {
  const [h, m] = time.split(':').map(Number) as [number, number]
  return h * 60 + m
}

const pad = (n: number): string => String(n).padStart(2, '0')

/** Local date-time `minutes` after `date time`; may roll over to following days. */
export const addMinutes = (date: ISODate, time: HHMM, minutes: number): LocalDateTime => {
  const total = toMinutes(time) + minutes
  const dayShift = Math.floor(total / 1440)
  const rest = total - dayShift * 1440
  return `${addDays(date, dayShift)}T${pad(Math.floor(rest / 60))}:${pad(rest % 60)}`
}

export const splitDateTime = (value: LocalDateTime): { date: ISODate; time: HHMM } => {
  const [date, time] = value.split('T') as [ISODate, HHMM]
  return { date, time }
}

export const minDate = (a: ISODate, b: ISODate): ISODate => (a < b ? a : b)
export const maxDate = (a: ISODate, b: ISODate): ISODate => (a > b ? a : b)

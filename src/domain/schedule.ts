import { addDays, splitDateTime, weekdayOf } from './dates'
import type { HHMM, ISODate, LocalDateTime, ScheduleSegment, Weekday } from './types'

/** The segment in effect on `date` (last one with `from <= date`), if any. */
export const segmentAt = (
  sched: readonly ScheduleSegment[],
  date: ISODate,
): ScheduleSegment | undefined => {
  let found: ScheduleSegment | undefined
  for (const segment of sched) if (segment.from <= date) found = segment
  return found
}

export const activeWeekdays = (times: Partial<Record<Weekday, HHMM>>): Weekday[] =>
  (Object.keys(times).map(Number) as Weekday[])
    .filter((d) => times[d] != null)
    .sort((a, b) => a - b)

/**
 * Nearest date (today included only if its time is still ahead) whose weekday is scheduled.
 * Used to prefill "First session" on the create form.
 */
export const firstSessionDate = (
  times: Partial<Record<Weekday, HHMM>>,
  now: LocalDateTime,
): ISODate | null => {
  const { date: today, time: nowTime } = splitDateTime(now)
  for (let offset = 0; offset <= 7; offset++) {
    const date = addDays(today, offset)
    const time = times[weekdayOf(date)]
    if (time != null && (offset > 0 || time > nowTime)) return date
  }
  return null
}

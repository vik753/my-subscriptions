import { summarize } from './sessions'
import type { Hobby, ISODate, LocalDateTime } from './types'

/**
 * Hobbies that need the Renewal reminder, in list order: at most one paid session left and
 * not snoozed past today ("Remind me later" snoozes until tomorrow).
 */
export const renewalDue = (
  hobbies: readonly Hobby[],
  snoozedUntil: Readonly<Record<string, ISODate>>,
  now: LocalDateTime,
): string[] => {
  const today = now.slice(0, 10)
  return hobbies
    .filter((h) => !((snoozedUntil[h.id] ?? '') > today) && summarize(h, now).remaining <= 1)
    .map((h) => h.id)
}

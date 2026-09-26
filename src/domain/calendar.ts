import { addDays } from './dates'
import { summarize } from './sessions'
import type { HHMM, Hobby, ISODate, LocalDateTime, SessionKey } from './types'

/** What one Google Calendar event shows; text is added by the i18n layer. */
export interface CalendarEventModel {
  /** `${hobbyId}|${sessionKey}` */
  key: string
  hobbyId: string
  sessionKey: SessionKey
  name: string
  date: ISODate
  time: HHMM
  dur: number
  /** `forfeit`: cancelled without carrying the payment over — shown crossed out, not as attended. */
  status: 'paid' | 'unpaid' | 'attended' | 'forfeit'
  /** The last paid session of the hobby — its event asks to renew. */
  lastPaid: boolean
}

/**
 * Events for every session up to `weeksAhead` weeks from today (past ones keep theirs).
 * Missed / cancelled sessions have no event.
 */
export const calendarEvents = (
  hobbies: readonly Hobby[],
  now: LocalDateTime,
  weeksAhead = 12,
): CalendarEventModel[] => {
  const until = addDays(now.slice(0, 10), weeksAhead * 7)
  return hobbies.flatMap((hobby) => {
    const sessions = summarize(hobby, now).sessions
    const lastPaid = sessions.filter((s) => s.status === 'paid').pop()
    return sessions
      .flatMap(({ status, ...s }) =>
        s.date > until || status === 'missed' ? [] : [{ ...s, status }],
      )
      .map((s) => ({
        key: `${hobby.id}|${s.key}`,
        hobbyId: hobby.id,
        sessionKey: s.key,
        name: hobby.name,
        date: s.date,
        time: s.time,
        dur: s.dur,
        status: s.status,
        lastPaid: s.key === lastPaid?.key,
      }))
  })
}

/**
 * Deterministic Google Calendar event id (base32hex: 0-9, a-v). Retried inserts of the same session
 * hit the same id instead of creating duplicates, and the mapping never has to be stored.
 */
export const eventId = (hobbyId: string, sessionKey: SessionKey): string => {
  const text = `${hobbyId}|${sessionKey}`
  // Four hex digits per UTF-16 unit: unambiguous for any id, and hex is a subset of base32hex.
  return (
    'ms' +
    Array.from({ length: text.length }, (_, i) =>
      text.charCodeAt(i).toString(16).padStart(4, '0'),
    ).join('')
  )
}

/** Which events must be written (new or changed) and which removed, given the last synced hashes. */
export const diffEvents = (
  desired: readonly { key: string; hash: string }[],
  synced: Readonly<Record<string, string>>,
): { upsert: string[]; remove: string[] } => {
  const wanted = new Set(desired.map((d) => d.key))
  return {
    upsert: desired.filter((d) => synced[d.key] !== d.hash).map((d) => d.key),
    remove: Object.keys(synced).filter((key) => !wanted.has(key)),
  }
}

/** FNV-1a — a short fingerprint of an event payload to detect changes. */
export const hashText = (text: string): string => {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

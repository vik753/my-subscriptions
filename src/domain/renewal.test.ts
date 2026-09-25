import { describe, expect, it } from 'vitest'
import { renewalDue } from './renewal'
import { createHobby, markSession } from './mutations'
import type { Hobby, ISODate, LocalDateTime, NewHobbyInput } from './types'

/** Thursday, so the default fixture's weekly slot lands exactly on `now`'s weekday. */
const NOW: LocalDateTime = '2026-09-24T10:02'
const TODAY: ISODate = '2026-09-24'
const TOMORROW: ISODate = '2026-09-25'
const YESTERDAY: ISODate = '2026-09-23'

/** `sessions` paid, no marks; weekday 3 (Thursday) at 10:00, matching `NOW`. */
function makeHobby(id: string, sessions: number, overrides: Partial<NewHobbyInput> = {}): Hobby {
  return createHobby({
    id,
    name: id,
    start: '2026-09-24',
    times: { 3: '10:00' },
    durs: { 3: 60 },
    currency: 'UAH',
    sessions,
    price: sessions * 1000,
    paymentDate: '2026-09-24',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  })
}

describe('renewalDue', () => {
  it('returns an empty list for no hobbies', () => {
    expect(renewalDue([], {}, NOW)).toEqual([])
  })

  it('does not flag a hobby with remaining > 1', () => {
    const h = makeHobby('h1', 2)
    expect(renewalDue([h], {}, NOW)).toEqual([])
  })

  it('flags a hobby with exactly 1 remaining session', () => {
    const h = makeHobby('h1', 1)
    expect(renewalDue([h], {}, NOW)).toEqual(['h1'])
  })

  it('flags a hobby with 0 remaining after its only session was attended', () => {
    const h = markSession(makeHobby('h1', 1), '2026-09-24', 'attended')
    expect(renewalDue([h], {}, NOW)).toEqual(['h1'])
  })

  it('flags a hobby with 0 remaining after its only session was forfeited', () => {
    const h = markSession(makeHobby('h1', 1), '2026-09-24', 'forfeit')
    expect(renewalDue([h], {}, NOW)).toEqual(['h1'])
  })

  it('does not let an unmarked past (pending) session reduce remaining', () => {
    // 2 paid sessions, the first already elapsed and unmarked (pending); remaining stays 2.
    const h = makeHobby('h1', 2, { start: '2026-09-10' })
    expect(renewalDue([h], {}, NOW)).toEqual([])
  })

  it('does not flag a hobby snoozed until tomorrow', () => {
    const h = makeHobby('h1', 1)
    expect(renewalDue([h], { h1: TOMORROW }, NOW)).toEqual([])
  })

  it('flags a hobby snoozed until today (snooze from yesterday has elapsed)', () => {
    const h = makeHobby('h1', 1)
    expect(renewalDue([h], { h1: TODAY }, NOW)).toEqual(['h1'])
  })

  it('flags a hobby snoozed until a past date', () => {
    const h = makeHobby('h1', 1)
    expect(renewalDue([h], { h1: YESTERDAY }, NOW)).toEqual(['h1'])
  })

  it('flags a hobby with no snooze entry at all', () => {
    const h = makeHobby('h1', 1)
    expect(renewalDue([h], {}, NOW)).toEqual(['h1'])
  })

  it('a snooze entry for another id does not suppress this hobby', () => {
    const h1 = makeHobby('h1', 1)
    const h2 = makeHobby('h2', 1)
    expect(renewalDue([h1, h2], { h2: TOMORROW }, NOW)).toEqual(['h1'])
  })

  it('preserves input order and lists only the due ones', () => {
    const due1 = makeHobby('z-first', 1)
    const notDue = makeHobby('a-second', 2)
    const due2 = makeHobby('m-third', 1)
    expect(renewalDue([due1, notDue, due2], {}, NOW)).toEqual(['z-first', 'm-third'])
  })
})

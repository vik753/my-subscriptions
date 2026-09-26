import { describe, expect, it } from 'vitest'
import { calendarEvents, diffEvents, eventId } from './calendar'
import { addPayment, cancelSession, createHobby, markSession, moveSession } from './mutations'
import type { CalendarEventModel } from './calendar'
import type { Hobby, LocalDateTime, NewHobbyInput } from './types'

/** Thursday, matches the prototype's demo "now". */
const NOW: LocalDateTime = '2026-09-24T10:02'

function makeHobby(overrides: Partial<NewHobbyInput> = {}): Hobby {
  return createHobby({
    id: 'h1',
    name: 'Yoga',
    start: '2026-09-24',
    times: { 3: '10:00' },
    durs: { 3: 60 },
    currency: 'UAH',
    sessions: 2,
    price: 2000,
    paymentDate: '2026-09-24',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  })
}

/** Finds an event by its original session key, throwing if it wasn't produced. */
function at(events: CalendarEventModel[], sessionKey: string): CalendarEventModel {
  const e = events.find((x) => x.sessionKey === sessionKey)
  if (!e) throw new Error(`no calendar event for session ${sessionKey}`)
  return e
}

/** First element of a non-empty array, throwing (failing the test) otherwise. */
function first<T>(arr: readonly T[]): T {
  const x = arr[0]
  if (!x) throw new Error('expected a non-empty array')
  return x
}

describe('calendarEvents — session inclusion window', () => {
  it('includes a session that falls exactly on today + 7×weeksAhead days (default 12 weeks)', () => {
    // Many payments so the domain's own generation window reaches well past 12 weeks.
    const h = makeHobby({ sessions: 100, price: 100000 })
    const events = calendarEvents([h], NOW)
    expect(events.some((e) => e.date === '2026-12-17')).toBe(true) // today + 84 days
  })

  it('excludes sessions beyond today + 7×weeksAhead days', () => {
    const h = makeHobby({ sessions: 100, price: 100000 })
    const events = calendarEvents([h], NOW)
    expect(events.some((e) => e.date === '2026-12-24')).toBe(false) // today + 91 days
  })

  it('respects a custom weeksAhead window', () => {
    const h = makeHobby({ sessions: 0, price: 0 })
    const events = calendarEvents([h], NOW, 1)
    expect(events.some((e) => e.date === '2026-10-01')).toBe(true) // today + 7 days
    expect(events.some((e) => e.date === '2026-10-08')).toBe(false) // today + 14 days
  })

  it('includes past sessions (they keep their event, e.g. attended turns Sage)', () => {
    const h = makeHobby({ start: '2026-09-10', sessions: 1, price: 1000 })
    const events = calendarEvents([h], NOW)
    expect(events.some((e) => e.sessionKey === '2026-09-10')).toBe(true)
  })
})

describe('calendarEvents — cancelled and missed sessions get no event', () => {
  it('omits the event for a session marked missed', () => {
    const h = markSession(makeHobby(), '2026-09-24', 'missed')
    const events = calendarEvents([h], NOW)
    expect(events.some((e) => e.sessionKey === '2026-09-24')).toBe(false)
  })

  it('omits the event for a session cancelled with the payment carried over', () => {
    const h = cancelSession(makeHobby(), '2026-09-24', true, NOW)
    const events = calendarEvents([h], NOW)
    expect(events.some((e) => e.sessionKey === '2026-09-24')).toBe(false)
    // The carried-over payment lands on the next session, which becomes paid.
    expect(at(events, '2026-10-01').status).toBe('paid')
  })
})

describe('calendarEvents — status mapping', () => {
  it('maps an unpaid session (beyond the paid count) to status "unpaid"', () => {
    const h = makeHobby({ sessions: 1, price: 1000 })
    const events = calendarEvents([h], NOW)
    expect(at(events, '2026-09-24').status).toBe('paid')
    expect(at(events, '2026-10-01').status).toBe('unpaid')
  })

  it('maps an attended session to status "attended"', () => {
    const h = markSession(makeHobby({ sessions: 1, price: 1000 }), '2026-09-24', 'attended')
    const events = calendarEvents([h], NOW)
    expect(at(events, '2026-09-24').status).toBe('attended')
  })

  it('maps a forfeit session (consumes a paid slot, no carry-over) to status "forfeit", not "attended"', () => {
    const h = cancelSession(makeHobby({ sessions: 1, price: 1000 }), '2026-09-24', false, NOW)
    const events = calendarEvents([h], NOW)
    expect(at(events, '2026-09-24').status).toBe('forfeit')
  })

  it('keeps an event for a forfeit session (crossed out, not deleted) while an attended session keeps status "attended"', () => {
    const forfeited = cancelSession(
      makeHobby({ sessions: 2, price: 2000 }),
      '2026-09-24',
      false,
      NOW,
    )
    const attended = markSession(
      makeHobby({ sessions: 2, price: 2000, id: 'h2' }),
      '2026-09-24',
      'attended',
    )
    const forfeitEvents = calendarEvents([forfeited], NOW)
    const attendedEvents = calendarEvents([attended], NOW)
    expect(forfeitEvents.some((e) => e.sessionKey === '2026-09-24')).toBe(true)
    expect(at(forfeitEvents, '2026-09-24').status).toBe('forfeit')
    expect(at(attendedEvents, '2026-09-24').status).toBe('attended')
  })

  it('keeps a pending (unmarked, already ended) session on its paid/unpaid status', () => {
    // Start two weeks before "now" so the first two sessions are already over and unanswered.
    const h = makeHobby({ start: '2026-09-10', sessions: 1, price: 1000 })
    const events = calendarEvents([h], NOW)
    expect(at(events, '2026-09-10').status).toBe('paid')
    expect(at(events, '2026-09-17').status).toBe('unpaid')
  })
})

describe('calendarEvents — moved sessions', () => {
  it('uses the moved date and time', () => {
    const h = moveSession(makeHobby(), '2026-09-24', { date: '2026-09-26', time: '18:30' })
    const events = calendarEvents([h], NOW)
    const e = at(events, '2026-09-24')
    expect(e.date).toBe('2026-09-26')
    expect(e.time).toBe('18:30')
  })

  it('keeps the original session key (and the composite key built from it) after a move', () => {
    const h = moveSession(makeHobby(), '2026-09-24', { date: '2026-09-26', time: '18:30' })
    const events = calendarEvents([h], NOW)
    const e = at(events, '2026-09-24')
    expect(e.key).toBe(`${h.id}|2026-09-24`)
  })
})

describe('calendarEvents — lastPaid', () => {
  it('marks only the chronologically last paid session of a hobby as lastPaid', () => {
    const h = makeHobby({ sessions: 2, price: 2000 })
    const events = calendarEvents([h], NOW)
    expect(at(events, '2026-09-24').lastPaid).toBe(false)
    expect(at(events, '2026-10-01').lastPaid).toBe(true)
    expect(at(events, '2026-10-08').lastPaid).toBe(false) // unpaid
  })

  it('never marks a forfeit session as lastPaid, even if it was the last paid slot before cancelling', () => {
    const h = cancelSession(makeHobby({ sessions: 1, price: 1000 }), '2026-09-24', false, NOW)
    const events = calendarEvents([h], NOW)
    expect(at(events, '2026-09-24').lastPaid).toBe(false)
  })

  it('leaves every event lastPaid=false when the hobby has no paid session', () => {
    const h = makeHobby({ sessions: 0, price: 0 })
    const events = calendarEvents([h], NOW)
    expect(events.every((e) => e.lastPaid === false)).toBe(true)
  })

  it('computes lastPaid independently per hobby', () => {
    const h1 = makeHobby({ id: 'h1', sessions: 1, price: 1000 })
    const h2 = addPayment(makeHobby({ id: 'h2', name: 'Swim', sessions: 1, price: 1000 }), {
      date: '2026-09-24',
      n: 0,
      price: 0,
    })
    const events = calendarEvents([h1, h2], NOW)
    expect(
      at(
        events.filter((e) => e.hobbyId === 'h1'),
        '2026-09-24',
      ).lastPaid,
    ).toBe(true)
    expect(
      at(
        events.filter((e) => e.hobbyId === 'h2'),
        '2026-09-24',
      ).lastPaid,
    ).toBe(true)
  })
})

describe('calendarEvents — ordering', () => {
  it('orders events by hobby list order, then chronologically within a hobby', () => {
    const h1 = makeHobby({ id: 'h1', name: 'Yoga', sessions: 1, price: 1000 })
    const h2 = makeHobby({
      id: 'h2',
      name: 'Swim',
      start: '2026-09-25',
      times: { 4: '09:00' },
      durs: { 4: 45 },
      sessions: 1,
      price: 1000,
    })
    const events = calendarEvents([h2, h1], NOW)
    const h2Events = events.filter((e) => e.hobbyId === 'h2')
    const h1Events = events.filter((e) => e.hobbyId === 'h1')
    expect(events.indexOf(first(h2Events))).toBeLessThan(events.indexOf(first(h1Events)))
    const h1Dates = h1Events.map((e) => e.date)
    expect(h1Dates).toEqual([...h1Dates].sort())
  })
})

describe('eventId', () => {
  it('is deterministic: the same input always produces the same id', () => {
    expect(eventId('h1', '2026-09-24')).toBe(eventId('h1', '2026-09-24'))
  })

  it('differs when the hobby id differs', () => {
    expect(eventId('h1', '2026-09-24')).not.toBe(eventId('h2', '2026-09-24'))
  })

  it('differs when the session key differs', () => {
    expect(eventId('h1', '2026-09-24')).not.toBe(eventId('h1', '2026-09-25'))
  })

  it('is a valid Google Calendar client event id for a uuid-like hobby id', () => {
    const id = eventId('3fa85f64-5717-4562-b3fc-2c963f66afa6', '2026-09-24')
    expect(id).toMatch(/^[a-v0-9]+$/)
    expect(id.length).toBeGreaterThanOrEqual(5)
    expect(id.length).toBeLessThanOrEqual(1024)
  })

  it('is a valid Google Calendar client event id even for input with uppercase and non-ASCII characters', () => {
    const id = eventId('Gym-Ω', '2026-09-24')
    expect(id).toMatch(/^[a-v0-9]+$/)
    expect(id.length).toBeGreaterThanOrEqual(5)
    expect(id.length).toBeLessThanOrEqual(1024)
  })
})

describe('diffEvents', () => {
  it('upserts keys missing from synced', () => {
    const { upsert, remove } = diffEvents([{ key: 'a', hash: 'h1' }], {})
    expect(upsert).toEqual(['a'])
    expect(remove).toEqual([])
  })

  it('upserts keys whose hash changed', () => {
    const { upsert } = diffEvents([{ key: 'a', hash: 'h2' }], { a: 'h1' })
    expect(upsert).toEqual(['a'])
  })

  it('removes synced keys that are no longer desired', () => {
    const { remove } = diffEvents([], { a: 'h1', b: 'h2' })
    expect(new Set(remove)).toEqual(new Set(['a', 'b']))
  })

  it('produces empty upsert and remove when desired matches synced exactly', () => {
    const { upsert, remove } = diffEvents([{ key: 'a', hash: 'h1' }], { a: 'h1' })
    expect(upsert).toEqual([])
    expect(remove).toEqual([])
  })

  it('preserves the desired order in upsert, independent of synced', () => {
    const { upsert } = diffEvents(
      [
        { key: 'b', hash: 'h2' },
        { key: 'a', hash: 'h1' },
      ],
      {},
    )
    expect(upsert).toEqual(['b', 'a'])
  })

  it('combines upsert and remove in a single diff', () => {
    const { upsert, remove } = diffEvents(
      [
        { key: 'a', hash: 'h1' }, // unchanged
        { key: 'b', hash: 'h2-new' }, // changed
      ],
      { a: 'h1', b: 'h2-old', c: 'h3' }, // c no longer desired
    )
    expect(upsert).toEqual(['b'])
    expect(remove).toEqual(['c'])
  })
})

import { describe, expect, it } from 'vitest'
import {
  addPayment,
  cancelSession,
  createHobby,
  editSchedule,
  markSession,
  moveAllFollowing,
  moveSession,
  restoreSession,
} from './index'
import type { Hobby, LocalDateTime, NewHobbyInput } from './types'

const NOW: LocalDateTime = '2026-09-24T10:02' // Thursday

function makeHobby(overrides: Partial<Hobby> = {}): Hobby {
  return {
    id: 'h1',
    name: 'Yoga',
    start: '2026-09-24',
    sched: [{ from: '2026-09-24', times: { 3: '10:00' }, durs: { 3: 60 } }],
    payments: [],
    currency: 'UAH',
    marks: {},
    moves: {},
    updatedAt: '2026-01-01T00:00:00.000Z',
    google: { calendar: false, backup: false },
    ...overrides,
  }
}

/** Recursively freezes an object graph so any mutation attempt throws (ES modules run in strict mode). */
function deepFreeze<T>(obj: T): T {
  Object.freeze(obj)
  if (obj && typeof obj === 'object') {
    for (const v of Object.values(obj as Record<string, unknown>)) {
      if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v)
    }
  }
  return obj
}

describe('createHobby', () => {
  it('builds a hobby with a single schedule segment and a single payment from the input', () => {
    const input: NewHobbyInput = {
      id: 'h1',
      name: 'Yoga',
      start: '2026-09-24',
      times: { 3: '10:00' },
      durs: { 3: 60 },
      currency: 'UAH',
      sessions: 8,
      price: 4000,
      paymentDate: '2026-09-20',
      updatedAt: '2026-09-20T12:00:00.000Z',
    }
    const h = createHobby(input)
    expect(h.id).toBe('h1')
    expect(h.name).toBe('Yoga')
    expect(h.start).toBe('2026-09-24')
    expect(h.sched).toEqual([{ from: '2026-09-24', times: { 3: '10:00' }, durs: { 3: 60 } }])
    expect(h.payments).toEqual([{ date: '2026-09-20', n: 8, price: 4000 }])
    expect(h.marks).toEqual({})
    expect(h.moves).toEqual({})
    expect(h.updatedAt).toBe('2026-09-20T12:00:00.000Z')
  })
})

describe('addPayment', () => {
  it('appends a payment without mutating the original hobby', () => {
    const h = makeHobby({ payments: [{ date: '2026-08-01', n: 4, price: 1000 }] })
    const before = structuredClone(h)
    const payment = { date: '2026-09-24', n: 4, price: 1200 }

    const h2 = addPayment(h, payment)

    expect(h2.payments).toEqual([...before.payments, payment])
    expect(h).toEqual(before)
    expect(h2.updatedAt).toBe(h.updatedAt)
  })
})

describe('markSession / restoreSession', () => {
  it('markSession sets the mark for a session key without mutating the original', () => {
    const h = makeHobby()
    const before = structuredClone(h)

    const h2 = markSession(h, '2026-09-24', 'attended')

    expect(h2.marks).toEqual({ '2026-09-24': 'attended' })
    expect(h).toEqual(before)
  })

  it('restoreSession removes the mark for a session key, leaving others untouched', () => {
    const h = makeHobby({ marks: { '2026-09-24': 'attended', '2026-10-01': 'missed' } })
    const before = structuredClone(h)

    const h2 = restoreSession(h, '2026-09-24')

    expect(h2.marks).toEqual({ '2026-10-01': 'missed' })
    expect(h).toEqual(before)
  })
})

describe('cancelSession', () => {
  it('marks a currently-paid session forfeit when the payment is not carried over', () => {
    const h = makeHobby({ payments: [{ date: '2026-09-24', n: 1, price: 500 }] })
    const before = structuredClone(h)

    const h2 = cancelSession(h, '2026-09-24', false, NOW)

    expect(h2.marks['2026-09-24']).toBe('forfeit')
    expect(h).toEqual(before)
  })

  it('marks a currently-paid session cancelled when the payment is carried over', () => {
    const h = makeHobby({ payments: [{ date: '2026-09-24', n: 1, price: 500 }] })

    const h2 = cancelSession(h, '2026-09-24', true, NOW)

    expect(h2.marks['2026-09-24']).toBe('cancelled')
  })

  it('marks a currently-unpaid session cancelled even without carrying the payment (no slot to forfeit)', () => {
    const h = makeHobby({ payments: [] })

    const h2 = cancelSession(h, '2026-09-24', false, NOW)

    expect(h2.marks['2026-09-24']).toBe('cancelled')
  })
})

describe('moveSession (one-off move)', () => {
  it('sets a one-off move for the session key', () => {
    const h = makeHobby()
    const before = structuredClone(h)

    const h2 = moveSession(h, '2026-09-24', { date: '2026-09-26', time: '11:00' })

    expect(h2.moves).toEqual({ '2026-09-24': { date: '2026-09-26', time: '11:00' } })
    expect(h).toEqual(before)
  })

  it('removes the move when moved back to its original date and time', () => {
    const h = makeHobby({ moves: { '2026-09-24': { date: '2026-09-26', time: '11:00' } } })

    const h2 = moveSession(h, '2026-09-24', { date: '2026-09-24', time: '10:00' })

    expect(h2.moves).toEqual({})
  })
})

describe('moveAllFollowing', () => {
  it('creates a new schedule segment that moves the weekday going forward, dropping the one-off move', () => {
    const h = makeHobby({
      start: '2026-08-03',
      sched: [{ from: '2026-08-03', times: { 0: '09:00' }, durs: { 0: 60 } }], // weekly Monday
      moves: { '2026-09-07': { date: '2026-09-08', time: '12:00' } },
    })
    const before = structuredClone(h)

    // original date 2026-09-07 is a Monday (weekday 0); target 2026-09-09 is a Wednesday (weekday 2)
    const h2 = moveAllFollowing(h, '2026-09-07', { date: '2026-09-09', time: '18:00' })

    expect(h2.sched).toEqual([
      { from: '2026-08-03', times: { 0: '09:00' }, durs: { 0: 60 } },
      { from: '2026-09-07', times: { 2: '18:00' }, durs: { 2: 60 } },
    ])
    expect(h2.moves['2026-09-07']).toBeUndefined()
    expect(h).toEqual(before)
  })

  it('uses the earlier of the original/target dates as the new segment start, and keeps prior segments before it', () => {
    const h = makeHobby({
      start: '2026-08-03',
      sched: [
        { from: '2026-08-03', times: { 0: '09:00' }, durs: { 0: 60 } },
        { from: '2026-09-14', times: { 0: '09:00', 4: '20:00' }, durs: { 0: 60, 4: 45 } },
      ],
    })

    // original date 2026-09-21 (Monday, weekday 0) moved to an EARLIER date 2026-09-16 (Wednesday, weekday 2)
    const h2 = moveAllFollowing(h, '2026-09-21', { date: '2026-09-16', time: '19:00' })

    expect(h2.sched).toEqual([
      { from: '2026-08-03', times: { 0: '09:00' }, durs: { 0: 60 } },
      { from: '2026-09-14', times: { 0: '09:00', 4: '20:00' }, durs: { 0: 60, 4: 45 } },
      { from: '2026-09-16', times: { 4: '20:00', 2: '19:00' }, durs: { 4: 45, 2: 60 } },
    ])
  })

  it('only changes the time when the target date falls on the same weekday', () => {
    const h = makeHobby({
      start: '2026-08-03',
      sched: [{ from: '2026-08-03', times: { 0: '09:00' }, durs: { 0: 60 } }],
    })

    // 2026-09-07 and 2026-09-14 are both Mondays
    const h2 = moveAllFollowing(h, '2026-09-07', { date: '2026-09-14', time: '17:00' })

    expect(h2.sched).toEqual([
      { from: '2026-08-03', times: { 0: '09:00' }, durs: { 0: 60 } },
      { from: '2026-09-07', times: { 0: '17:00' }, durs: { 0: 60 } },
    ])
  })

  it('drops any later schedule segment whose from date is on/after the new segment start', () => {
    const h = makeHobby({
      start: '2026-08-03',
      sched: [
        { from: '2026-08-03', times: { 0: '09:00' }, durs: { 0: 60 } },
        { from: '2026-09-21', times: { 0: '09:00' }, durs: { 0: 60 } },
      ],
    })

    // new segment starts 2026-09-14 (min of original 2026-09-21 and target 2026-09-14) — the 09-21 segment must be dropped
    const h2 = moveAllFollowing(h, '2026-09-21', { date: '2026-09-14', time: '20:00' })

    expect(h2.sched).toEqual([
      { from: '2026-08-03', times: { 0: '09:00' }, durs: { 0: 60 } },
      { from: '2026-09-14', times: { 0: '20:00' }, durs: { 0: 60 } },
    ])
  })
})

describe('editSchedule', () => {
  it('drops segments from the edit date onward and appends the new segment', () => {
    const h = makeHobby({
      sched: [
        { from: '2026-08-01', times: { 0: '09:00' }, durs: { 0: 60 } },
        { from: '2026-09-01', times: { 0: '09:00' }, durs: { 0: 60 } },
      ],
    })

    const h2 = editSchedule(h, '2026-09-01', { 2: '18:00' }, { 2: 45 })

    expect(h2.sched).toEqual([
      { from: '2026-08-01', times: { 0: '09:00' }, durs: { 0: 60 } },
      { from: '2026-09-01', times: { 2: '18:00' }, durs: { 2: 45 } },
    ])
  })

  it('keeps past marks and moves untouched', () => {
    const h = makeHobby({
      sched: [{ from: '2026-08-01', times: { 0: '09:00' }, durs: { 0: 60 } }],
      marks: { '2026-08-03': 'attended' },
      moves: { '2026-08-10': { date: '2026-08-11', time: '10:00' } },
    })
    const before = structuredClone(h)

    const h2 = editSchedule(h, '2026-09-01', { 2: '18:00' }, { 2: 45 })

    expect(h2.marks).toEqual(before.marks)
    expect(h2.moves).toEqual(before.moves)
    expect(h).toEqual(before)
  })
})

describe('purity and updatedAt', () => {
  it('never mutates the input hobby (deep-freeze canary: any write attempt throws)', () => {
    const frozen = deepFreeze(
      makeHobby({
        sched: [{ from: '2026-08-03', times: { 0: '09:00' }, durs: { 0: 60 } }],
        payments: [{ date: '2026-08-03', n: 1, price: 300 }],
        marks: { '2026-08-03': 'attended' },
      }),
    )

    expect(() => addPayment(frozen, { date: '2026-09-24', n: 1, price: 100 })).not.toThrow()
    expect(() => markSession(frozen, '2026-08-10', 'attended')).not.toThrow()
    expect(() => restoreSession(frozen, '2026-08-03')).not.toThrow()
    expect(() => cancelSession(frozen, '2026-08-10', false, NOW)).not.toThrow()
    expect(() =>
      moveSession(frozen, '2026-08-10', { date: '2026-08-11', time: '09:00' }),
    ).not.toThrow()
    expect(() =>
      moveAllFollowing(frozen, '2026-08-10', { date: '2026-08-12', time: '18:00' }),
    ).not.toThrow()
    expect(() => editSchedule(frozen, '2026-09-01', { 2: '18:00' }, { 2: 45 })).not.toThrow()
  })

  it('never changes updatedAt', () => {
    const h = makeHobby({ updatedAt: '2026-01-01T00:00:00.000Z' })

    expect(addPayment(h, { date: '2026-09-24', n: 1, price: 100 }).updatedAt).toBe(h.updatedAt)
    expect(markSession(h, '2026-09-24', 'attended').updatedAt).toBe(h.updatedAt)
    expect(cancelSession(h, '2026-09-24', true, NOW).updatedAt).toBe(h.updatedAt)
    expect(moveSession(h, '2026-09-24', { date: '2026-09-25', time: '10:00' }).updatedAt).toBe(
      h.updatedAt,
    )
    expect(moveAllFollowing(h, '2026-09-24', { date: '2026-10-01', time: '10:00' }).updatedAt).toBe(
      h.updatedAt,
    )
    expect(editSchedule(h, '2026-10-01', { 3: '10:00' }, { 3: 60 }).updatedAt).toBe(h.updatedAt)
  })
})

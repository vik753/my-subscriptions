import { describe, expect, it } from 'vitest'
import { summarize } from './index'
import type { Hobby, LocalDateTime, Session } from './types'

/** Thursday. Chosen so the default fixture's weekly slot lands exactly on `now`'s weekday. */
const NOW: LocalDateTime = '2026-09-24T10:02'

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
    google: { calendar: false, backup: false, guests: [], paidColor: '10' },
    ...overrides,
  }
}

/** Finds a session by key, throwing (failing the test) if it was not generated. */
function at(sessions: Session[], key: string): Session {
  const s = sessions.find((x) => x.key === key)
  if (!s) throw new Error(`session ${key} was not generated`)
  return s
}

describe('session generation window', () => {
  it('always reaches at least today + 12 weeks (84 days), regardless of hobby.start', () => {
    const h = makeHobby()
    const s = summarize(h, NOW)
    const keys = s.sessions.map((x) => x.key)
    // today (2026-09-24) + 77 days = 2026-12-10, the last matching Thursday on/before the 84-day bound.
    expect(keys).toContain('2026-12-10')
  })

  it('extends beyond the default window to cover every paid session', () => {
    const h = makeHobby({ payments: [{ date: '2026-09-24', n: 200, price: 200000 }] })
    const s = summarize(h, NOW)
    expect(s.sessions.length).toBeGreaterThanOrEqual(200)
  })
})

describe('schedule segments', () => {
  it('uses the last segment with from <= date for each generated session', () => {
    const h = makeHobby({
      sched: [
        { from: '2026-09-24', times: { 3: '10:00' }, durs: { 3: 60 } },
        { from: '2026-10-15', times: { 3: '18:00' }, durs: { 3: 90 } },
      ],
    })
    const s = summarize(h, NOW)
    expect(at(s.sessions, '2026-10-08').time).toBe('10:00')
    expect(at(s.sessions, '2026-10-08').dur).toBe(60)
    expect(at(s.sessions, '2026-10-15').time).toBe('18:00')
    expect(at(s.sessions, '2026-10-15').dur).toBe(90)
  })

  it('produces no sessions for an empty schedule', () => {
    const h = makeHobby({ sched: [] })
    const s = summarize(h, NOW)
    expect(s.sessions).toEqual([])
    expect(s.next).toBeNull()
    expect(s.pending).toEqual([])
    expect(s.remaining).toBe(0)
    expect(s.pricePerSession).toBeNull()
  })

  it('produces no sessions for a weekday with no time entry', () => {
    const h = makeHobby({ sched: [{ from: '2026-09-24', times: {}, durs: {} }] })
    const s = summarize(h, NOW)
    expect(s.sessions).toEqual([])
  })
})

describe('date arithmetic robustness', () => {
  it('does not skip or duplicate a session across the year boundary (Dec 2026 -> Jan 2027)', () => {
    // start on the boundary Thursday itself so the default 12-week window comfortably covers it,
    // independent of the separate "today + 84 days" minimum.
    const h = makeHobby({
      start: '2026-12-17',
      sched: [{ from: '2026-12-17', times: { 3: '10:00' }, durs: { 3: 60 } }],
    })
    const s = summarize(h, NOW)
    const keys = s.sessions.map((x) => x.key)
    expect(keys).toContain('2026-12-31')
    expect(keys).toContain('2027-01-07')
    expect(keys.filter((k) => k === '2026-12-31')).toHaveLength(1)
  })

  it('does not skip or duplicate the session around the autumn DST change (2026-10-25)', () => {
    const h = makeHobby({
      start: '2026-10-11',
      sched: [{ from: '2026-10-11', times: { 6: '10:00' }, durs: { 6: 60 } }],
    })
    const s = summarize(h, NOW)
    expect(at(s.sessions, '2026-10-25').time).toBe('10:00')
    expect(s.sessions.some((x) => x.key === '2026-11-01')).toBe(true)
  })

  it('does not skip or duplicate the session around the spring DST change (2027-03-28)', () => {
    const h = makeHobby({
      start: '2027-03-14',
      sched: [{ from: '2027-03-14', times: { 6: '10:00' }, durs: { 6: 60 } }],
    })
    const s = summarize(h, NOW)
    expect(at(s.sessions, '2027-03-28').time).toBe('10:00')
    expect(s.sessions.some((x) => x.key === '2027-04-04')).toBe(true)
  })
})

describe('moves inside summarize', () => {
  it('applies a one-off move to date/time and records movedFrom', () => {
    const h = makeHobby({ moves: { '2026-10-01': { date: '2026-10-03', time: '15:00' } } })
    const s = summarize(h, NOW)
    const moved = at(s.sessions, '2026-10-01')
    expect(moved.date).toBe('2026-10-03')
    expect(moved.time).toBe('15:00')
    expect(moved.movedFrom).toEqual({ date: '2026-10-01', time: '10:00' })
  })

  it('keeps the sessions array sorted by date, time, then key after moves reorder them', () => {
    const h = makeHobby({ moves: { '2026-10-08': { date: '2026-09-20', time: '08:00' } } })
    const s = summarize(h, NOW)
    const sortKey = (x: Session) => `${x.date}${x.time}${x.key}`
    const sorted = [...s.sessions].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
    expect(s.sessions.map((x) => x.key)).toEqual(sorted.map((x) => x.key))
    expect(s.sessions[0]?.key).toBe('2026-10-08')
  })

  it('ignores marks and moves whose key is not a generated session', () => {
    const h = makeHobby({
      marks: { '2099-01-01': 'attended' },
      moves: { '2099-01-01': { date: '2099-01-02', time: '11:00' } },
    })
    const s = summarize(h, NOW)
    expect(s.sessions.some((x) => x.key === '2099-01-01')).toBe(false)
    expect(s.attended).toBe(0)
  })
})

describe('payment assignment (Core rule 3)', () => {
  it('assigns the earliest paid slots chronologically: missed/cancelled skip, forfeit and paid/attended consume, overflow is unpaid', () => {
    const h = makeHobby({
      start: '2026-08-03',
      sched: [{ from: '2026-08-03', times: { 0: '09:00' }, durs: { 0: 60 } }],
      payments: [{ date: '2026-08-03', n: 3, price: 900 }],
      marks: {
        '2026-08-03': 'cancelled',
        '2026-08-10': 'missed',
        '2026-08-17': 'forfeit',
        '2026-08-24': 'attended',
      },
    })
    const s = summarize(h, NOW)
    expect(at(s.sessions, '2026-08-03').status).toBe('missed')
    expect(at(s.sessions, '2026-08-10').status).toBe('missed')
    expect(at(s.sessions, '2026-08-17').status).toBe('forfeit')
    expect(at(s.sessions, '2026-08-24').status).toBe('attended')
    expect(at(s.sessions, '2026-08-31').status).toBe('paid') // consumes the 3rd and last slot
    expect(at(s.sessions, '2026-09-07').status).toBe('unpaid') // no slots left
  })

  it('keeps a session attended (not unpaid) when marked attended beyond the paid total (design-review decision 1)', () => {
    const h = makeHobby({
      start: '2026-08-03',
      sched: [{ from: '2026-08-03', times: { 0: '09:00' }, durs: { 0: 60 } }],
      payments: [{ date: '2026-08-03', n: 1, price: 300 }],
      marks: { '2026-08-03': 'attended', '2026-08-10': 'attended' },
    })
    const s = summarize(h, NOW)
    expect(at(s.sessions, '2026-08-03').status).toBe('attended')
    expect(at(s.sessions, '2026-08-10').status).toBe('attended')
  })

  it('a pending session still occupies its paid slot until answered', () => {
    const h = makeHobby({
      start: '2026-08-03',
      sched: [{ from: '2026-08-03', times: { 0: '09:00' }, durs: { 0: 60 } }],
      payments: [{ date: '2026-08-03', n: 1, price: 300 }],
    })
    const s = summarize(h, NOW)
    expect(at(s.sessions, '2026-08-03').pending).toBe(true)
    expect(at(s.sessions, '2026-08-03').status).toBe('paid')
    expect(at(s.sessions, '2026-08-10').status).toBe('unpaid')
  })
})

describe('remaining and pricePerSession', () => {
  it('remaining = max(0, paidTotal - attended - forfeit)', () => {
    const h = makeHobby({
      start: '2026-08-03',
      sched: [{ from: '2026-08-03', times: { 0: '09:00' }, durs: { 0: 60 } }],
      payments: [{ date: '2026-08-03', n: 1, price: 300 }],
      marks: { '2026-08-03': 'attended', '2026-08-10': 'attended', '2026-08-17': 'forfeit' },
    })
    const s = summarize(h, NOW)
    expect(s.attended).toBe(2)
    expect(s.remaining).toBe(0) // floored, would be 1 - 2 - 1 = -2
  })

  it('pricePerSession comes from the LAST payment only, rounded to a whole minor unit', () => {
    const h = makeHobby({
      payments: [
        { date: '2026-08-01', n: 4, price: 1000 },
        { date: '2026-09-01', n: 5, price: 2025 },
      ],
    })
    const s = summarize(h, NOW)
    expect(s.paidTotal).toBe(9)
    expect(s.priceTotal).toBe(3025)
    expect(s.pricePerSession).toBe(405) // round(2025 / 5)
  })

  it('rounds a fractional pricePerSession to the nearest whole minor unit', () => {
    const h = makeHobby({ payments: [{ date: '2026-08-01', n: 3, price: 1000 }] })
    const s = summarize(h, NOW)
    expect(s.pricePerSession).toBe(333) // round(1000 / 3) = 333.33 -> 333
  })

  it('pricePerSession is null without any payments', () => {
    const h = makeHobby({ payments: [] })
    const s = summarize(h, NOW)
    expect(s.pricePerSession).toBeNull()
  })
})

describe('pending / next (Core rules 6-8, "App open check")', () => {
  it('a session is pending when it has no mark and its end (start + dur) is strictly before now', () => {
    const h = makeHobby({
      start: '2026-08-03',
      sched: [{ from: '2026-08-03', times: { 0: '09:00' }, durs: { 0: 60 } }],
    })
    const s = summarize(h, NOW)
    const past = at(s.sessions, '2026-09-21') // Monday before NOW, already ended
    expect(past.pending).toBe(true)
    expect(s.pending.map((p) => p.key)).toContain('2026-09-21')
  })

  it('a session that has not ended yet is not pending, even if in progress', () => {
    const h = makeHobby({
      start: '2026-09-24',
      sched: [{ from: '2026-09-24', times: { 3: '09:30' }, durs: { 3: 60 } }], // 09:30-10:30, now = 10:02
    })
    const s = summarize(h, NOW)
    expect(at(s.sessions, '2026-09-24').pending).toBe(false)
  })

  it('next is the first unmarked, non-pending session — an in-progress session counts as next', () => {
    const h = makeHobby({
      start: '2026-09-24',
      sched: [{ from: '2026-09-24', times: { 3: '09:30' }, durs: { 3: 60 } }],
    })
    const s = summarize(h, NOW)
    expect(s.next?.key).toBe('2026-09-24')
    expect(s.next?.pending).toBe(false)
  })

  it('next skips pending sessions and marked sessions', () => {
    const h = makeHobby({
      start: '2026-08-03',
      sched: [{ from: '2026-08-03', times: { 0: '09:00' }, durs: { 0: 60 } }],
      marks: { '2026-09-21': 'attended' }, // last past Monday before now, but marked
    })
    const s = summarize(h, NOW)
    // all earlier unmarked sessions are pending (already ended); next must be a future, unmarked one
    expect(s.next?.pending).toBe(false)
    expect(s.next?.mark).toBeUndefined()
  })
})

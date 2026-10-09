import { describe, expect, it } from 'vitest'
import { addPayment, cancelSession, createHobby, markSession, moveSession } from './mutations'
import { sessionPayment, summarize } from './sessions'
import type { Hobby, LocalDateTime } from './types'

// design-review.md decision 19: summarize(hobby, now).payable — the sessions a new payment can
// start at: every slot-consuming session that holds no slot in decision 16's walk.
//
// Weekly Tuesday slot starting 2026-09-29:
// 09-29, 10-06, 10-13, 10-20, 10-27, 11-03, 11-10, 11-17, 11-24, 12-01, 12-08 ...
const NOW: LocalDateTime = '2026-09-30T10:02'
const LATE: LocalDateTime = '2026-10-21T12:00' // 09-29 .. 10-20 are in the past

/** Hobby with no payments — tests add their own via `addPayment`. */
function unpaidHobby(overrides: Partial<Hobby> = {}): Hobby {
  const h = createHobby({
    id: 'h1',
    name: 'Yoga',
    start: '2026-09-29',
    times: { 1: '10:00' },
    durs: { 1: 60 },
    paymentDate: '2026-09-29',
    sessions: 0,
    price: 0,
    currency: 'UAH',
    updatedAt: '2026-01-01T00:00:00.000Z',
    google: {},
    ...overrides,
  })
  return { ...h, payments: [] }
}

const payableKeys = (h: Hobby, now: LocalDateTime) => summarize(h, now).payable.map((s) => s.key)
const allKeys = (h: Hobby, now: LocalDateTime) => summarize(h, now).sessions.map((s) => s.key)
const statusOf = (h: Hobby, key: string, now: LocalDateTime) =>
  summarize(h, now).sessions.find((s) => s.key === key)?.status

describe('payable: unpaid hobby', () => {
  it('lists every generated session, chronologically, when nothing is paid or marked', () => {
    const h = unpaidHobby()
    const keys = payableKeys(h, NOW)
    expect(keys.length).toBeGreaterThan(0)
    expect(keys).toEqual(allKeys(h, NOW))
    expect(keys).toEqual([...keys].sort())
  })
})

describe('payable: payments', () => {
  it('starts after the sessions a legacy payment (no from) covers', () => {
    const h = addPayment(unpaidHobby(), { date: '2026-09-29', n: 3, price: 3000 })
    const keys = payableKeys(h, NOW)
    expect(keys.slice(0, 2)).toEqual(['2026-10-20', '2026-10-27'])
    expect(keys).toEqual(allKeys(h, NOW).slice(3))
  })

  it('includes past unmarked (pending) unpaid sessions', () => {
    const h = unpaidHobby()
    const keys = payableKeys(h, LATE)
    expect(keys.slice(0, 4)).toEqual(['2026-09-29', '2026-10-06', '2026-10-13', '2026-10-20'])
  })
})

describe('payable: marked sessions', () => {
  it('includes an attended session no payment covers and keeps it attended', () => {
    const h = markSession(unpaidHobby(), '2026-09-29', 'attended')
    expect(payableKeys(h, NOW)).toContain('2026-09-29')
    expect(statusOf(h, '2026-09-29', NOW)).toBe('attended')
  })

  it('excludes an attended session that holds a slot', () => {
    const h = markSession(
      addPayment(unpaidHobby(), { date: '2026-09-29', n: 2, price: 2000 }),
      '2026-09-29',
      'attended',
    )
    expect(sessionPayment(h, '2026-09-29', NOW)).toBe(0)
    expect(payableKeys(h, NOW)).not.toContain('2026-09-29')
  })

  it('never includes a missed session, paid or not', () => {
    const unpaid = markSession(unpaidHobby(), '2026-09-29', 'missed')
    expect(payableKeys(unpaid, NOW)).not.toContain('2026-09-29')
    const paid = markSession(
      addPayment(unpaidHobby(), { date: '2026-09-29', n: 2, price: 2000 }),
      '2026-09-29',
      'missed',
    )
    expect(payableKeys(paid, NOW)).not.toContain('2026-09-29')
  })

  it('never includes a cancelled session, paid (carry-over) or not', () => {
    const unpaid = cancelSession(unpaidHobby(), '2026-09-29', true, NOW)
    expect(payableKeys(unpaid, NOW)).not.toContain('2026-09-29')
    const paid = cancelSession(
      addPayment(unpaidHobby(), { date: '2026-09-29', n: 2, price: 2000 }),
      '2026-09-29',
      true,
      NOW,
    )
    expect(payableKeys(paid, NOW)).not.toContain('2026-09-29')
  })

  it('includes a forfeit session with no slot but not one holding a slot', () => {
    const noSlot = markSession(unpaidHobby(), '2026-09-29', 'forfeit')
    expect(payableKeys(noSlot, NOW)).toContain('2026-09-29')
    const withSlot = markSession(
      addPayment(unpaidHobby(), { date: '2026-09-29', n: 1, price: 1000 }),
      '2026-09-29',
      'forfeit',
    )
    expect(sessionPayment(withSlot, '2026-09-29', NOW)).toBe(0)
    expect(payableKeys(withSlot, NOW)).not.toContain('2026-09-29')
  })
})

describe('payable: paying after the fact (decision 19)', () => {
  const attendedThree = () => {
    let h = unpaidHobby()
    for (const k of ['2026-09-29', '2026-10-06', '2026-10-13']) h = markSession(h, k, 'attended')
    return h
  }
  const THREE = ['2026-09-29', '2026-10-06', '2026-10-13']
  const AFTER: LocalDateTime = '2026-10-14T10:00'

  it('offers the three attended, unpaid sessions before any payment', () => {
    expect(payableKeys(attendedThree(), AFTER).slice(0, 3)).toEqual(THREE)
  })

  it('a payment of 3 from the first attended session covers all three and they stay attended', () => {
    const h = addPayment(attendedThree(), {
      date: '2026-10-14',
      n: 3,
      price: 3000,
      from: '2026-09-29',
    })
    const keys = payableKeys(h, AFTER)
    for (const k of THREE) {
      expect(keys).not.toContain(k)
      expect(statusOf(h, k, AFTER)).toBe('attended')
      expect(sessionPayment(h, k, AFTER)).toBe(0)
    }
    expect(summarize(h, AFTER).remaining).toBe(0)
    expect(keys[0]).toBe('2026-10-20')
    expect(sessionPayment(h, '2026-10-20', AFTER)).toBeNull()
  })

  it('a payment of 2 from the first leaves the third attended session payable', () => {
    const h = addPayment(attendedThree(), {
      date: '2026-10-14',
      n: 2,
      price: 2000,
      from: '2026-09-29',
    })
    const keys = payableKeys(h, AFTER)
    expect(keys).not.toContain('2026-09-29')
    expect(keys).not.toContain('2026-10-06')
    expect(keys[0]).toBe('2026-10-13')
    expect(statusOf(h, '2026-10-13', AFTER)).toBe('attended')
  })
})

describe('payable: consistency', () => {
  const mixed = (): Hobby => {
    let h = unpaidHobby()
    h = addPayment(h, { date: '2026-09-29', n: 2, price: 2000 })
    h = addPayment(h, { date: '2026-10-15', n: 2, price: 2000, from: '2026-10-13' })
    h = addPayment(h, { date: '2026-10-21', n: 1, price: 1000, from: '2026-11-03' })
    h = markSession(h, '2026-09-29', 'attended')
    h = markSession(h, '2026-10-06', 'missed')
    h = markSession(h, '2026-10-13', 'attended')
    h = markSession(h, '2026-10-20', 'forfeit')
    h = cancelSession(h, '2026-10-27', true, LATE)
    h = markSession(h, '2026-11-10', 'attended')
    h = markSession(h, '2026-11-17', 'forfeit')
    h = moveSession(h, '2026-11-24', { date: '2026-11-25', time: '11:00' })
    return h
  }

  it('a session is payable exactly when it is not missed/cancelled and holds no slot', () => {
    const h = mixed()
    const { sessions, payable } = summarize(h, LATE)
    const keys = new Set(payable.map((s) => s.key))
    expect(sessions.length).toBeGreaterThan(0)
    for (const s of sessions) {
      const consumes = s.status !== 'missed'
      expect(keys.has(s.key), s.key).toBe(consumes && sessionPayment(h, s.key, LATE) === null)
    }
    expect(keys.size).toBeGreaterThan(0)
  })

  it('is ordered like sessions (a subsequence of it)', () => {
    const h = mixed()
    const all = allKeys(h, LATE)
    const keys = payableKeys(h, LATE)
    expect(keys).toEqual(all.filter((k) => keys.includes(k)))
  })
})

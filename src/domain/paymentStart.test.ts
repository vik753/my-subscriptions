import { describe, expect, it } from 'vitest'
import { addPayment, cancelSession, createHobby, markSession, moveSession } from './mutations'
import { summarize } from './sessions'
import type { Hobby, LocalDateTime } from './types'

// Weekly Tuesday slot starting 2026-09-29 so sessions land on predictable dates:
// 09-29, 10-06, 10-13, 10-20, 10-27, 11-03, 11-10, 11-17, 11-24, 12-01, 12-08 ...
const NOW: LocalDateTime = '2026-09-30T10:02'

/** Weekly slot, no payments beyond overrides — the shared starting point for these tests. */
function baseHobby(overrides: Partial<Hobby> = {}): Hobby {
  return createHobby({
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
}

/** Hobby with no payments at all — tests add their own via `addPayment`. */
function unpaidHobby(overrides: Partial<Hobby> = {}): Hobby {
  const h = baseHobby(overrides)
  return { ...h, payments: [] }
}

describe('legacy payment without `from` (decision 16 backward compatibility)', () => {
  it('behaves exactly as sequential-from-start assignment', () => {
    const h = addPayment(unpaidHobby(), { date: '2026-09-29', n: 3, price: 3000 })
    const s = summarize(h, NOW)
    // sessions: 09-29, 10-06, 10-13, 10-20, ...
    expect(s.sessions.slice(0, 4).map((x) => [x.key, x.status])).toEqual([
      ['2026-09-29', 'paid'],
      ['2026-10-06', 'paid'],
      ['2026-10-13', 'paid'],
      ['2026-10-20', 'unpaid'],
    ])
  })
})

describe('anchored payment (`from` set) pays starting at that session', () => {
  it('leaves unpaid sessions before `from` unpaid, pays n from `from` on, and the next one stays unpaid', () => {
    const h = addPayment(unpaidHobby(), {
      date: '2026-10-13',
      n: 1,
      from: '2026-10-13',
      price: 1000,
    })
    const s = summarize(h, NOW)
    expect(s.sessions.slice(0, 4).map((x) => [x.key, x.status])).toEqual([
      ['2026-09-29', 'unpaid'],
      ['2026-10-06', 'unpaid'],
      ['2026-10-13', 'paid'],
      ['2026-10-20', 'unpaid'],
    ])
  })

  it('when `from` falls between sessions, coverage starts at the first session after it', () => {
    // 10-13 is a session date; pick a from that has no session (a Wednesday, one day later).
    const h = addPayment(unpaidHobby(), {
      date: '2026-10-14',
      n: 1,
      from: '2026-10-14',
      price: 1000,
    })
    const s = summarize(h, NOW)
    expect(s.sessions.slice(0, 3).map((x) => [x.key, x.status])).toEqual([
      ['2026-09-29', 'unpaid'],
      ['2026-10-06', 'unpaid'],
      ['2026-10-13', 'unpaid'], // before `from`, not covered
    ])
    expect(s.sessions[3]).toMatchObject({ key: '2026-10-20', status: 'paid' })
  })
})

describe('missed/cancelled sessions inside an anchored payment carry the slot forward', () => {
  it('still pays n sessions total after `from`, skipping the missed one', () => {
    let h = addPayment(unpaidHobby(), { date: '2026-10-13', n: 3, from: '2026-10-13', price: 3000 })
    h = markSession(h, '2026-10-20', 'missed')
    const s = summarize(h, NOW)
    expect(s.sessions.slice(0, 6).map((x) => [x.key, x.status])).toEqual([
      ['2026-09-29', 'unpaid'],
      ['2026-10-06', 'unpaid'],
      ['2026-10-13', 'paid'],
      ['2026-10-20', 'missed'],
      ['2026-10-27', 'paid'],
      ['2026-11-03', 'paid'],
    ])
  })
})

describe('legacy credits extend past the point an anchored payment starts', () => {
  it('legacy payment covers up through and past `from`; anchored payment extends coverage further', () => {
    // Legacy payment (no from): 4 sessions, sequential from the start.
    // Anchored payment: from the 3rd session (2026-10-13), n = 2 more.
    let h = addPayment(unpaidHobby(), { date: '2026-09-29', n: 4, price: 4000 })
    h = addPayment(h, { date: '2026-10-20', n: 2, from: '2026-10-13', price: 2000 })
    const s = summarize(h, NOW)
    // 09-29, 10-06, 10-13, 10-20 paid by legacy (4 slots); 10-27, 11-03 paid by the anchored payment (2 slots).
    expect(s.sessions.slice(0, 6).map((x) => [x.key, x.status])).toEqual([
      ['2026-09-29', 'paid'],
      ['2026-10-06', 'paid'],
      ['2026-10-13', 'paid'],
      ['2026-10-20', 'paid'],
      ['2026-10-27', 'paid'],
      ['2026-11-03', 'paid'],
    ])
    expect(s.sessions[6]).toMatchObject({ status: 'unpaid' })
    expect(s.paidTotal).toBe(6)
  })
})

describe('moved sessions use their actual (moved) date to test payment availability', () => {
  it('a session moved on or after `from` is paid; a session moved before `from` is not', () => {
    let h = addPayment(unpaidHobby(), { date: '2026-10-20', n: 2, from: '2026-10-20', price: 2000 })
    // 09-29 lands after `from`; 10-27 lands before it.
    h = moveSession(h, '2026-09-29', { date: '2026-10-21', time: '10:00' })
    h = moveSession(h, '2026-10-27', { date: '2026-10-14', time: '10:00' })
    const s = summarize(h, NOW)
    const status = (key: string) => s.sessions.find((x) => x.key === key)?.status
    expect(status('2026-10-27')).toBe('unpaid')
    expect(status('2026-10-20')).toBe('paid')
    expect(status('2026-09-29')).toBe('paid')
    expect(status('2026-11-03')).toBe('unpaid')
  })
})

describe('remaining (decision 16)', () => {
  it('legacy 8 paid, 9th attended beyond paid slots: remaining is 0, attended session stays attended', () => {
    let h = addPayment(unpaidHobby(), { date: '2026-09-29', n: 8, price: 8000 })
    // Mark all 8 as attended plus one more (9th session) attended, with no slot left.
    const keys = [
      '2026-09-29',
      '2026-10-06',
      '2026-10-13',
      '2026-10-20',
      '2026-10-27',
      '2026-11-03',
      '2026-11-10',
      '2026-11-17',
      '2026-11-24',
    ]
    for (const k of keys) h = markSession(h, k, 'attended')
    let s = summarize(h, NOW)
    expect(s.remaining).toBe(0)
    expect(s.sessions.find((x) => x.key === '2026-11-24')).toMatchObject({ status: 'attended' })

    // Now add 1 more session anchored at a future session (2026-12-01): remaining becomes 1, that
    // session is paid.
    h = addPayment(h, { date: '2026-12-01', n: 1, from: '2026-12-01', price: 1000 })
    s = summarize(h, NOW)
    expect(s.remaining).toBe(1)
    expect(s.sessions.find((x) => x.key === '2026-12-01')).toMatchObject({ status: 'paid' })
  })

  it('legacy-only: remaining equals paid - attended - forfeit when nothing is pending unmarked before a marked one', () => {
    let h = addPayment(unpaidHobby(), { date: '2026-09-29', n: 5, price: 5000 })
    h = markSession(h, '2026-09-29', 'attended')
    h = cancelSession(h, '2026-10-06', false, NOW) // paid, not carrying -> forfeit
    const s = summarize(h, NOW)
    expect(s.remaining).toBe(5 - 1 - 1)
  })
})

describe('forfeit before an anchor does not borrow the anchored slot', () => {
  it('a forfeited session before `from` with no legacy slot available stays unpaid-consuming (forfeit) without a slot, the anchor is untouched', () => {
    let h = addPayment(unpaidHobby(), { date: '2026-10-20', n: 1, from: '2026-10-20', price: 1000 })
    // 09-29 session is before `from` and has no payment available -> cancelling without carry over
    // cannot mark it forfeit (cancelSession only forfeits an already-`paid` session); confirm it's
    // cancelled directly instead, per decision 10, and the anchored slot still pays 10-20.
    h = cancelSession(h, '2026-09-29', false, NOW)
    const s = summarize(h, NOW)
    expect(s.sessions.find((x) => x.key === '2026-09-29')).toMatchObject({
      mark: 'cancelled',
      status: 'missed',
    })
    expect(s.sessions.find((x) => x.key === '2026-10-20')).toMatchObject({ status: 'paid' })
  })
})

describe('generation window reaches past the latest `from`', () => {
  it('a payment anchored far in the future still has its sessions generated and paid', () => {
    // 30 weeks after start (2026-09-29 + 210 days) — well beyond the default ~12-16 week window.
    const farFrom = '2027-04-27' // a Tuesday-ish date about 30 weeks out; nearest Monday session follows
    const h = addPayment(unpaidHobby(), { date: farFrom, n: 1, from: farFrom, price: 1000 })
    const s = summarize(h, NOW)
    const paidSessions = s.sessions.filter((x) => x.status === 'paid')
    expect(paidSessions.length).toBe(1)
    expect(paidSessions[0] && paidSessions[0].key >= farFrom).toBe(true)
    expect(s.remaining).toBe(1)
  })
})

describe('payment order does not affect resulting statuses', () => {
  it('anchored payment first, legacy payment second gives the same statuses as the reverse order', () => {
    const legacy = { date: '2026-09-29', n: 4, price: 4000 }
    const anchored = { date: '2026-10-20', n: 2, from: '2026-10-13', price: 2000 }

    let h1 = addPayment(unpaidHobby(), legacy)
    h1 = addPayment(h1, anchored)

    let h2 = addPayment(unpaidHobby(), anchored)
    h2 = addPayment(h2, legacy)

    const s1 = summarize(h1, NOW).sessions.map((x) => [x.key, x.status])
    const s2 = summarize(h2, NOW).sessions.map((x) => [x.key, x.status])
    expect(s1).toEqual(s2)
  })
  it('two anchored payments recorded out of date order unlock at their own dates', () => {
    let h = addPayment(unpaidHobby(), { date: '2026-10-01', n: 1, from: '2026-11-03', price: 1000 })
    h = addPayment(h, { date: '2026-10-01', n: 1, from: '2026-10-13', price: 1000 })
    const paid = summarize(h, NOW)
      .sessions.filter((x) => x.status === 'paid')
      .map((x) => x.key)
    expect(paid).toEqual(['2026-10-13', '2026-11-03'])
  })
})

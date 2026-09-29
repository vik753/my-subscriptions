import { describe, expect, it } from 'vitest'
import { addPayment, cancelSession, createHobby, markSession } from './mutations'
import { sessionPayment, summarize } from './sessions'
import type { Hobby, LocalDateTime } from './types'

// design-review.md decision 18: sessionPayment(hobby, key, now) -> index into hobby.payments,
// or null for a session holding no slot. Builds on decision 16's chronological slot walk.
//
// Weekly Tuesday slot starting 2026-09-29, so sessions land on predictable dates:
// 09-29, 10-06, 10-13, 10-20, 10-27, 11-03, 11-10, 11-17, 11-24, 12-01, 12-08 ...
const NOW: LocalDateTime = '2026-09-30T10:02'

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

describe('single legacy payment', () => {
  it('names the payment for every session it covers; the session past n is null', () => {
    const h = addPayment(unpaidHobby(), { date: '2026-09-29', n: 4, price: 4000 })
    expect(sessionPayment(h, '2026-09-29', NOW)).toBe(0)
    expect(sessionPayment(h, '2026-10-06', NOW)).toBe(0)
    expect(sessionPayment(h, '2026-10-13', NOW)).toBe(0)
    expect(sessionPayment(h, '2026-10-20', NOW)).toBe(0)
    expect(sessionPayment(h, '2026-10-27', NOW)).toBeNull() // 5th session, past n
  })
})

describe('two legacy payments', () => {
  it('hands out slots from the first payment before moving to the second, in array order', () => {
    let h = addPayment(unpaidHobby(), { date: '2026-09-29', n: 2, price: 2000 }) // index 0
    h = addPayment(h, { date: '2026-09-29', n: 3, price: 3000 }) // index 1
    expect(sessionPayment(h, '2026-09-29', NOW)).toBe(0)
    expect(sessionPayment(h, '2026-10-06', NOW)).toBe(0)
    expect(sessionPayment(h, '2026-10-13', NOW)).toBe(1)
    expect(sessionPayment(h, '2026-10-20', NOW)).toBe(1)
    expect(sessionPayment(h, '2026-10-27', NOW)).toBe(1)
    expect(sessionPayment(h, '2026-11-03', NOW)).toBeNull() // 6th session, past n=5 total
  })
})

describe('a missed or cancelled session does not consume a slot', () => {
  it('is null itself, and the next consuming session takes the slot it left behind (same index)', () => {
    let h = addPayment(unpaidHobby(), { date: '2026-09-29', n: 2, price: 2000 })
    h = markSession(h, '2026-09-29', 'attended') // consumes slot 1 of payment 0
    h = markSession(h, '2026-10-06', 'missed') // does not consume
    // 2026-10-13 is the next consuming session: it takes payment 0's remaining (2nd) slot.
    expect(sessionPayment(h, '2026-09-29', NOW)).toBe(0)
    expect(sessionPayment(h, '2026-10-06', NOW)).toBeNull()
    expect(sessionPayment(h, '2026-10-13', NOW)).toBe(0)
    expect(sessionPayment(h, '2026-10-20', NOW)).toBeNull() // payment 0 is now exhausted
  })
})

describe('attended and forfeit sessions that hold a slot return their payment', () => {
  it('an attended session within the paid count names its payment', () => {
    const h = markSession(
      addPayment(unpaidHobby(), { date: '2026-09-29', n: 1, price: 1000 }),
      '2026-09-29',
      'attended',
    )
    expect(sessionPayment(h, '2026-09-29', NOW)).toBe(0)
  })

  it('an attended session beyond every paid slot stays attended (decision 1) but names no payment', () => {
    let h = addPayment(unpaidHobby(), { date: '2026-09-29', n: 1, price: 1000 })
    h = markSession(h, '2026-09-29', 'attended')
    h = markSession(h, '2026-10-06', 'attended') // no slot left
    const s = summarize(h, NOW)
    expect(s.sessions.find((x) => x.key === '2026-10-06')).toMatchObject({ status: 'attended' })
    expect(sessionPayment(h, '2026-10-06', NOW)).toBeNull()
  })

  it('a forfeited session (cancelled without carrying the payment over) names the payment it consumed', () => {
    let h = addPayment(unpaidHobby(), { date: '2026-09-29', n: 1, price: 1000 })
    // decision 10: cancelling a paid session without carry-over turns it forfeit, still consuming.
    h = cancelSession(h, '2026-09-29', false, NOW)
    const s = summarize(h, NOW)
    expect(s.sessions.find((x) => x.key === '2026-09-29')).toMatchObject({ status: 'forfeit' })
    expect(sessionPayment(h, '2026-09-29', NOW)).toBe(0)
  })
})

describe('anchored payment (`from` set)', () => {
  it('names no payment for sessions before `from`, and its own index for the sessions it covers', () => {
    const h = addPayment(unpaidHobby(), {
      date: '2026-10-13',
      n: 2,
      from: '2026-10-13',
      price: 2000,
    })
    expect(sessionPayment(h, '2026-09-29', NOW)).toBeNull()
    expect(sessionPayment(h, '2026-10-06', NOW)).toBeNull()
    expect(sessionPayment(h, '2026-10-13', NOW)).toBe(0)
    expect(sessionPayment(h, '2026-10-20', NOW)).toBe(0)
    expect(sessionPayment(h, '2026-10-27', NOW)).toBeNull() // past n
  })
})

describe('legacy payment plus an anchored payment recorded after it (array order: legacy first)', () => {
  it('legacy slots are available earlier, so they are used first even after the anchor unlocks', () => {
    let h = addPayment(unpaidHobby(), { date: '2026-09-29', n: 2, price: 2000 }) // index 0, legacy
    h = addPayment(h, { date: '2026-10-06', n: 2, from: '2026-10-06', price: 2000 }) // index 1, anchored
    // Session 1: only the legacy payment is available.
    expect(sessionPayment(h, '2026-09-29', NOW)).toBe(0)
    // Session 2: the anchor unlocks here too, but the legacy payment still has a free slot
    // and, having no `from`, is available earlier -> it wins.
    expect(sessionPayment(h, '2026-10-06', NOW)).toBe(0)
    // Session 3 and 4: legacy is exhausted, the anchored payment takes over.
    expect(sessionPayment(h, '2026-10-13', NOW)).toBe(1)
    expect(sessionPayment(h, '2026-10-20', NOW)).toBe(1)
  })
})

describe('two anchored payments recorded out of `from` order', () => {
  it('array index names the payment; which one unlocks first follows `from`, not recording order', () => {
    let h = addPayment(unpaidHobby(), { date: '2026-10-01', n: 1, from: '2026-11-03', price: 1000 }) // index 0, later from
    h = addPayment(h, { date: '2026-10-01', n: 1, from: '2026-10-13', price: 1000 }) // index 1, earlier from
    // The payment with the earlier `from` (index 1) unlocks first, even though it was recorded second.
    expect(sessionPayment(h, '2026-10-13', NOW)).toBe(1)
    expect(sessionPayment(h, '2026-11-03', NOW)).toBe(0)
  })
})

describe('two anchored payments with the same `from`', () => {
  it('array order breaks the tie', () => {
    let h = addPayment(unpaidHobby(), { date: '2026-10-01', n: 1, from: '2026-10-06', price: 1000 })
    h = addPayment(h, { date: '2026-10-02', n: 1, from: '2026-10-06', price: 1000 })
    expect(sessionPayment(h, '2026-10-06', NOW)).toBe(0)
    expect(sessionPayment(h, '2026-10-13', NOW)).toBe(1)
  })
})

describe('unknown session key', () => {
  it('returns null for a key that names no generated session', () => {
    const h = addPayment(unpaidHobby(), { date: '2026-09-29', n: 4, price: 4000 })
    expect(sessionPayment(h, '2099-01-01', NOW)).toBeNull()
  })
})

describe('consistency with statuses (decision 16 and 18 name the same slot)', () => {
  it('every session is non-null exactly when it is paid, and null when unpaid or missed', () => {
    let h = addPayment(unpaidHobby(), { date: '2026-09-29', n: 3, price: 3000 })
    h = markSession(h, '2026-09-29', 'attended') // consumes slot 1
    h = markSession(h, '2026-10-06', 'missed') // does not consume
    h = cancelSession(h, '2026-10-13', false, NOW) // was paid -> forfeit, consumes slot 2
    // 2026-10-20 is left unmarked: it consumes the 3rd and last slot -> status 'paid'.
    // 2026-10-27 has none left -> status 'unpaid'.
    h = markSession(h, '2026-11-03', 'attended') // beyond every slot -> stays attended, no payment

    const s = summarize(h, NOW)
    const relevant = s.sessions.filter((x) =>
      ['2026-09-29', '2026-10-06', '2026-10-13', '2026-10-20', '2026-10-27', '2026-11-03'].includes(
        x.key,
      ),
    )
    expect(relevant.map((x) => x.status)).toEqual([
      'attended',
      'missed',
      'forfeit',
      'paid',
      'unpaid',
      'attended',
    ])

    for (const session of relevant) {
      const payment = sessionPayment(h, session.key, NOW)
      if (session.status === 'paid') expect(payment).not.toBeNull()
      if (session.status === 'unpaid' || session.status === 'missed') expect(payment).toBeNull()
    }
    // The two consuming marks (attended within slots, forfeit) also name their payment; the
    // attended-beyond-slots one does not — covered explicitly above, restated here for the mix.
    expect(sessionPayment(h, '2026-09-29', NOW)).toBe(0)
    expect(sessionPayment(h, '2026-10-13', NOW)).toBe(0)
    expect(sessionPayment(h, '2026-11-03', NOW)).toBeNull()
  })
})

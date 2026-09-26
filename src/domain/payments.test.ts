import { describe, expect, it } from 'vitest'
import { addPayment, createHobby, editPayment, markSession, removePayment } from './mutations'
import { summarize } from './sessions'
import type { Hobby, LocalDateTime } from './types'

/** Wednesday. Weekly slot lands on this weekday so `now` sits inside the generated window. */
const NOW: LocalDateTime = '2026-09-30T10:02'

/** 8-session pass, one weekly slot, no marks — the shared starting point for these tests. */
function baseHobby(overrides: Partial<Hobby> = {}): Hobby {
  return createHobby({
    id: 'h1',
    name: 'Yoga',
    start: '2026-09-30',
    times: { 2: '10:00' },
    durs: { 2: 60 },
    paymentDate: '2026-09-30',
    sessions: 8,
    price: 8000,
    currency: 'UAH',
    updatedAt: '2026-01-01T00:00:00.000Z',
    google: {},
    ...overrides,
  })
}

describe('editPayment', () => {
  it('replaces the payment at index, keeping other payments and their order', () => {
    const h = addPayment(baseHobby(), { date: '2026-11-01', n: 4, price: 4000 })
    const edited = editPayment(h, 0, { date: '2026-10-01', n: 10, price: 10000 })
    expect(edited.payments).toEqual([
      { date: '2026-10-01', n: 10, price: 10000 },
      { date: '2026-11-01', n: 4, price: 4000 },
    ])
  })

  it('leaves everything else on the hobby unchanged', () => {
    const h = baseHobby()
    const edited = editPayment(h, 0, { date: '2026-10-01', n: 10, price: 10000 })
    expect({ ...edited, payments: [] }).toEqual({ ...h, payments: [] })
  })

  it('does not mutate the input hobby or its payments array', () => {
    const h = baseHobby()
    const originalPayments = h.payments
    editPayment(h, 0, { date: '2026-10-01', n: 10, price: 10000 })
    expect(h.payments).toBe(originalPayments)
    expect(h.payments).toEqual([{ date: '2026-09-30', n: 8, price: 8000 }])
  })

  it('returns the hobby unchanged when index is out of range (too high)', () => {
    const h = baseHobby()
    const edited = editPayment(h, 5, { date: '2026-10-01', n: 10, price: 10000 })
    expect(edited).toEqual(h)
  })

  it('returns the hobby unchanged when index is out of range (negative)', () => {
    const h = baseHobby()
    const edited = editPayment(h, -1, { date: '2026-10-01', n: 10, price: 10000 })
    expect(edited).toEqual(h)
  })

  it('increasing n from 8 to 10 makes the 9th and 10th sessions paid', () => {
    const h = baseHobby()
    const edited = editPayment(h, 0, { date: '2026-09-30', n: 10, price: 10000 })
    const s = summarize(edited, NOW)
    expect(s.sessions.filter((x) => x.status === 'paid')).toHaveLength(10)
    expect(s.remaining).toBe(10)
  })

  it('decreasing n turns the now-unpaid sessions unpaid', () => {
    const h = baseHobby()
    const edited = editPayment(h, 0, { date: '2026-09-30', n: 3, price: 3000 })
    const s = summarize(edited, NOW)
    const paidCount = s.sessions.filter((x) => x.status === 'paid').length
    expect(paidCount).toBe(3)
    expect(s.remaining).toBe(3)
  })

  it('pricePerSession follows the edited price of the last payment', () => {
    const h = baseHobby()
    const edited = editPayment(h, 0, { date: '2026-09-30', n: 8, price: 16000 })
    const s = summarize(edited, NOW)
    expect(s.pricePerSession).toBe(2000)
  })

  it('editing an earlier payment does not change pricePerSession (derived from the last payment)', () => {
    const h = addPayment(baseHobby(), { date: '2026-11-25', n: 4, price: 4000 })
    const before = summarize(h, NOW).pricePerSession
    const edited = editPayment(h, 0, { date: '2026-09-30', n: 8, price: 999999 })
    const after = summarize(edited, NOW).pricePerSession
    expect(after).toBe(before)
    expect(after).toBe(1000) // 4000 / 4, unaffected by editing payment 0
  })

  it('leaves existing marks untouched', () => {
    const h = markSession(baseHobby(), '2026-09-30', 'attended')
    const edited = editPayment(h, 0, { date: '2026-09-30', n: 10, price: 10000 })
    expect(edited.marks).toEqual({ '2026-09-30': 'attended' })
  })
})

describe('removePayment', () => {
  it('removes the payment at index, keeping the others in order', () => {
    const h = addPayment(baseHobby(), { date: '2026-11-25', n: 4, price: 4000 })
    const removed = removePayment(h, 0)
    expect(removed.payments).toEqual([{ date: '2026-11-25', n: 4, price: 4000 }])
  })

  it('does not mutate the input hobby', () => {
    const h = addPayment(baseHobby(), { date: '2026-11-25', n: 4, price: 4000 })
    const before = h.payments.map((p) => ({ ...p }))
    removePayment(h, 0)
    expect(h.payments).toEqual(before)
  })

  it('returns the hobby unchanged when index is out of range', () => {
    const h = baseHobby()
    const removed = removePayment(h, 3)
    expect(removed).toEqual(h)
  })

  it('removing the only payment leaves an empty payments array, remaining 0 and pricePerSession null', () => {
    const h = baseHobby()
    const removed = removePayment(h, 0)
    expect(removed.payments).toEqual([])
    const s = summarize(removed, NOW)
    expect(s.remaining).toBe(0)
    expect(s.pricePerSession).toBeNull()
  })

  it('removing a payment turns later paid sessions unpaid', () => {
    const h = addPayment(baseHobby({ ...baseHobby() }), { date: '2026-11-25', n: 4, price: 4000 })
    const before = summarize(h, NOW)
    expect(before.remaining).toBe(12)
    const removed = removePayment(h, 1)
    const after = summarize(removed, NOW)
    expect(after.remaining).toBe(8)
    expect(after.sessions.filter((x) => x.status === 'paid')).toHaveLength(8)
  })

  it('leaves existing marks untouched', () => {
    const h = markSession(
      addPayment(baseHobby(), { date: '2026-11-25', n: 4, price: 4000 }),
      '2026-09-30',
      'attended',
    )
    const removed = removePayment(h, 1)
    expect(removed.marks).toEqual({ '2026-09-30': 'attended' })
  })
})

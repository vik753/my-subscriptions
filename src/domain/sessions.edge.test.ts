import { describe, expect, it } from 'vitest'
import { summarize, type Hobby } from './index'

// Implementation-level edge cases not pinned down by the spec-derived suites.
const NOW = '2026-09-24T10:02'

const hobby = (overrides: Partial<Hobby> = {}): Hobby => ({
  id: 'h',
  name: 'Gym',
  start: '2026-09-07',
  sched: [{ from: '2026-09-07', times: { 0: '10:00', 4: '18:00' }, durs: { 0: 60, 4: 90 } }],
  payments: [{ date: '2026-09-05', n: 8, price: 800_000 }],
  currency: 'UAH',
  marks: {},
  moves: {},
  updatedAt: '2026-09-05T00:00:00.000Z',
  ...overrides,
})

describe('summarize — edge cases', () => {
  it('defaults the duration to 60 minutes when a weekday has a time but no duration', () => {
    const h = hobby({ sched: [{ from: '2026-09-07', times: { 0: '10:00' }, durs: {} }] })
    expect(summarize(h, NOW).sessions[0]?.dur).toBe(60)
  })

  it('orders sessions moved to the same date and time by their key', () => {
    const slot = { date: '2026-10-10', time: '12:00' }
    const h = hobby({ moves: { '2026-09-28': slot, '2026-09-25': slot } })
    const atSlot = summarize(h, NOW).sessions.filter((s) => s.date === slot.date)
    expect(atSlot.map((s) => s.key)).toEqual(['2026-09-25', '2026-09-28'])
  })

  it('extends the window so every paid session exists even after many cancellations', () => {
    const marks: Hobby['marks'] = {}
    // Cancel the first 30 generated weeks' Mondays and Fridays — payment keeps carrying over.
    for (let week = 0; week < 30; week++) {
      const monday = new Date(Date.UTC(2026, 8, 7 + week * 7)).toISOString().slice(0, 10)
      const friday = new Date(Date.UTC(2026, 8, 11 + week * 7)).toISOString().slice(0, 10)
      marks[monday] = 'cancelled'
      marks[friday] = 'cancelled'
    }
    const s = summarize(hobby({ marks }), NOW)
    expect(s.sessions.filter((x) => x.status === 'paid')).toHaveLength(8)
    expect(s.sessions.some((x) => x.status === 'unpaid')).toBe(true)
  })
})

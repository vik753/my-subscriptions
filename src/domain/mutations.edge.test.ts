import { describe, expect, it } from 'vitest'
import { collectPending, moveAllFollowing, summarize, type Hobby } from './index'

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
  google: { calendar: false, backup: false, guests: [], paidColor: '10' },
  ...overrides,
})

describe('moveAllFollowing — behavior (design-review decision 8)', () => {
  it('builds the new schedule from the segment in effect on the moved session, not a later one', () => {
    const h = hobby({
      sched: [
        { from: '2026-09-07', times: { 0: '10:00', 4: '18:00' }, durs: { 0: 60, 4: 90 } },
        // Later segment with a different Friday time — must not leak into the new segment.
        { from: '2026-10-05', times: { 0: '10:00', 4: '20:00' }, durs: { 0: 60, 4: 45 } },
      ],
    })
    const moved = moveAllFollowing(h, '2026-09-28', { date: '2026-09-29', time: '11:00' })
    expect(moved.sched.at(-1)).toEqual({
      from: '2026-09-28',
      times: { 1: '11:00', 4: '18:00' },
      durs: { 1: 60, 4: 90 },
    })
  })

  it('moves every following Monday session to Tuesday and leaves earlier sessions untouched', () => {
    const moved = moveAllFollowing(hobby(), '2026-09-28', { date: '2026-09-29', time: '11:00' })
    const sessions = summarize(moved, NOW).sessions
    const before = sessions.filter((s) => s.date < '2026-09-28')
    const after = sessions.filter((s) => s.date >= '2026-09-28')

    expect(before.filter((s) => s.date === '2026-09-21').map((s) => s.time)).toEqual(['10:00'])
    expect(after.some((s) => s.date === '2026-09-28')).toBe(false)
    expect(after.find((s) => s.date === '2026-09-29')).toMatchObject({ time: '11:00', dur: 60 })
    expect(after.find((s) => s.date === '2026-10-06')).toMatchObject({ time: '11:00', dur: 60 })
    expect(after.find((s) => s.date === '2026-10-02')).toMatchObject({ time: '18:00', dur: 90 })
  })

  it('carries the 60-minute default when the moved weekday has no duration', () => {
    const h = hobby({ sched: [{ from: '2026-09-07', times: { 0: '10:00' }, durs: {} }] })
    const moved = moveAllFollowing(h, '2026-09-28', { date: '2026-09-29', time: '11:00' })
    expect(moved.sched.at(-1)?.durs).toEqual({ 1: 60 })
  })

  it('returns the hobby unchanged when the key is not a scheduled session', () => {
    const h = hobby()
    expect(moveAllFollowing(h, '2026-09-29', { date: '2026-09-30', time: '11:00' })).toBe(h)
  })
})

describe('collectPending — order', () => {
  it('orders overlapping sessions of one hobby by start, the order payments are assigned in', () => {
    // A: Mon 21 10:00–12:00. B: Tue 22 session moved to Mon 21 11:00–11:30 — ends first, starts later.
    const h = hobby({
      start: '2026-09-21',
      sched: [{ from: '2026-09-21', times: { 0: '10:00', 1: '09:00' }, durs: { 0: 120, 1: 30 } }],
      moves: { '2026-09-22': { date: '2026-09-21', time: '11:00' } },
    })
    const keys = collectPending([h], '2026-09-21T13:00').map((p) => p.session.key)
    expect(keys).toEqual(['2026-09-21', '2026-09-22'])
  })

  it('breaks ties between sessions moved to the same slot by key', () => {
    const slot = { date: '2026-09-21', time: '10:00' }
    const h = hobby({ moves: { '2026-09-18': slot, '2026-09-11': slot } })
    const keys = collectPending([h], NOW)
      .filter((p) => p.session.date === slot.date)
      .map((p) => p.session.key)
    expect(keys).toEqual(['2026-09-11', '2026-09-18', '2026-09-21'])
  })
})

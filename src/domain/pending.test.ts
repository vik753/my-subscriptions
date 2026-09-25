import { describe, expect, it } from 'vitest'
import { collectPending } from './index'
import type { Hobby, LocalDateTime } from './types'

const NOW: LocalDateTime = '2026-09-24T10:02' // Thursday

function makeHobby(overrides: Partial<Hobby> = {}): Hobby {
  return {
    id: 'h1',
    name: 'Yoga',
    start: '2026-08-03',
    sched: [{ from: '2026-08-03', times: { 0: '09:00' }, durs: { 0: 60 } }], // weekly Monday
    payments: [],
    currency: 'UAH',
    marks: {},
    moves: {},
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('collectPending (App open check rule 1)', () => {
  it('collects only pending sessions across all hobbies, sorted oldest first', () => {
    const h1 = makeHobby({
      id: 'h1',
      start: '2026-08-03',
      sched: [{ from: '2026-08-03', times: { 0: '09:00' }, durs: { 0: 60 } }],
    }) // Monday
    const h2 = makeHobby({
      id: 'h2',
      start: '2026-08-04',
      sched: [{ from: '2026-08-04', times: { 1: '09:00' }, durs: { 1: 60 } }],
    }) // Tuesday

    const items = collectPending([h1, h2], NOW)

    expect(items.length).toBeGreaterThan(0)
    expect(items.every((i) => i.session.pending)).toBe(true)
    expect(items.every((i) => i.session.mark === undefined)).toBe(true)

    const endKey = (end: { session: { date: string; time: string } }) =>
      `${end.session.date}${end.session.time}`
    const sorted = [...items].sort((a, b) => endKey(a).localeCompare(endKey(b)))
    expect(items).toEqual(sorted)

    // oldest pending session across both hobbies comes first
    expect(items[0]?.hobbyId).toBe('h1')
    expect(items[0]?.session.key).toBe('2026-08-03')
  })

  it('excludes marked sessions and sessions that have not ended yet', () => {
    const h = makeHobby({ marks: { '2026-08-03': 'attended' } })
    const items = collectPending([h], NOW)
    expect(items.some((i) => i.session.key === '2026-08-03')).toBe(false) // marked
    expect(items.some((i) => i.session.key === '2026-09-28')).toBe(false) // future Monday, not ended
  })

  it('breaks ties in end time by the order hobbies were given in the input', () => {
    const h1 = makeHobby({ id: 'h1' })
    const h2 = makeHobby({ id: 'h2' })

    const forward = collectPending([h1, h2], NOW)
    const reversed = collectPending([h2, h1], NOW)

    expect(forward[0]?.hobbyId).toBe('h1')
    expect(reversed[0]?.hobbyId).toBe('h2')
  })

  it('returns an empty array when no hobby has a pending session', () => {
    const h = makeHobby({ sched: [] })
    expect(collectPending([h], NOW)).toEqual([])
  })
})

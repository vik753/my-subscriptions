import { describe, expect, it } from 'vitest'
import { firstSessionDate } from './index'
import type { LocalDateTime } from './types'

const NOW: LocalDateTime = '2026-09-24T10:02' // Thursday (weekday 3)

describe('firstSessionDate', () => {
  it('returns null when no weekday has a time selected', () => {
    expect(firstSessionDate({}, NOW)).toBeNull()
  })

  it('returns today when today is selected and its time is strictly later than now', () => {
    expect(firstSessionDate({ 3: '10:30' }, NOW)).toBe('2026-09-24')
  })

  it('skips today when its time has already passed and wraps to next week if it is the only selected weekday', () => {
    expect(firstSessionDate({ 3: '09:00' }, NOW)).toBe('2026-10-01')
  })

  it('treats a time exactly equal to now as already passed (not strictly later)', () => {
    expect(firstSessionDate({ 3: '10:02' }, NOW)).toBe('2026-10-01')
  })

  it('returns the nearest upcoming weekday within the next 7 days when today is not selected', () => {
    expect(firstSessionDate({ 5: '09:00' }, NOW)).toBe('2026-09-26') // Saturday, 2 days out
  })

  it('wraps to next week when the only selected weekday already passed earlier this week', () => {
    expect(firstSessionDate({ 2: '09:00' }, NOW)).toBe('2026-09-30') // Wednesday, 6 days out
  })

  it('picks the earliest matching weekday among several selected, today excluded if already passed', () => {
    const times = { 3: '08:00', 5: '09:00', 0: '09:00' } // today (passed), Saturday (+2), Monday (+4)
    expect(firstSessionDate(times, NOW)).toBe('2026-09-26')
  })
})

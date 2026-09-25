import { describe, expect, it } from 'vitest'
import { monthGrid, shiftMonth } from './calendarGrid'

describe('monthGrid', () => {
  it('covers September 2026 in whole Monday-first weeks', () => {
    const grid = monthGrid(2026, 8)
    expect(grid).toHaveLength(35)
    expect(grid[0]).toEqual({ date: '2026-08-31', day: 31, inMonth: false })
    expect(grid[1]).toEqual({ date: '2026-09-01', day: 1, inMonth: true })
    expect(grid.at(-1)).toEqual({ date: '2026-10-04', day: 4, inMonth: false })
  })

  it('needs six weeks for a month starting on Sunday', () => {
    const grid = monthGrid(2026, 10) // Nov 1 2026 is a Sunday
    expect(grid).toHaveLength(42)
    expect(grid[6]).toMatchObject({ date: '2026-11-01', inMonth: true })
  })

  it('handles February in a leap year across the DST change month', () => {
    const feb = monthGrid(2028, 1)
    expect(feb.filter((d) => d.inMonth)).toHaveLength(29)
    const march = monthGrid(2027, 2)
    expect(new Set(march.map((d) => d.date)).size).toBe(march.length)
  })
})

describe('shiftMonth', () => {
  it('wraps across years', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual([2027, 0])
    expect(shiftMonth(2027, 0, -1)).toEqual([2026, 11])
    expect(shiftMonth(2026, 8, 0)).toEqual([2026, 8])
  })
})

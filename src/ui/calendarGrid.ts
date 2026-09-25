export interface CalendarDay {
  /** 'YYYY-MM-DD'. */
  date: string
  day: number
  inMonth: boolean
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Whole weeks (Mon → Sun) covering the month, including neighbouring-month days. monthIndex 0–11. */
export function monthGrid(year: number, monthIndex: number): CalendarDay[] {
  const first = Date.UTC(year, monthIndex, 1)
  const leading = (new Date(first).getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  const total = Math.ceil((leading + daysInMonth) / 7) * 7
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(first + (i - leading) * 86_400_000)
    return {
      date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === monthIndex,
    }
  })
}

/** Next / previous month as [year, monthIndex]. */
export const shiftMonth = (year: number, monthIndex: number, delta: number): [number, number] => {
  const d = new Date(Date.UTC(year, monthIndex + delta, 1))
  return [d.getUTCFullYear(), d.getUTCMonth()]
}

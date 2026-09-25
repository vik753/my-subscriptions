import { describe, expect, it } from 'vitest'
import type { Currency, HHMM, Weekday } from '../domain'
import {
  currencyLabel,
  formatDate,
  formatDateLong,
  formatMonthYear,
  formatMoney,
  formatSchedule,
} from './format'
import type { Language } from './index'

const LANGS: Language[] = ['en', 'uk', 'ru']

describe('formatDate', () => {
  it('formats a plain weekday in each language ("Fri, Sep 25")', () => {
    expect(formatDate('en', '2026-09-25')).toBe('Fri, Sep 25')
    expect(formatDate('uk', '2026-09-25')).toBe('пт, 25 вересня')
    expect(formatDate('ru', '2026-09-25')).toBe('пт, 25 сентября')
  })

  it('formats a Sunday', () => {
    expect(formatDate('en', '2026-09-27')).toBe('Sun, Sep 27')
    expect(formatDate('uk', '2026-09-27')).toBe('нд, 27 вересня')
    expect(formatDate('ru', '2026-09-27')).toBe('вс, 27 сентября')
  })

  it('formats a month boundary date', () => {
    expect(formatDate('en', '2026-09-30')).toBe('Wed, Sep 30')
    expect(formatDate('en', '2026-10-01')).toBe('Thu, Oct 1')
  })

  it('formats a December → January boundary', () => {
    expect(formatDate('en', '2025-12-31')).toBe('Wed, Dec 31')
    expect(formatDate('en', '2026-01-01')).toBe('Thu, Jan 1')
    expect(formatDate('uk', '2025-12-31')).toBe('ср, 31 грудня')
    expect(formatDate('uk', '2026-01-01')).toBe('чт, 1 січня')
  })
})

describe('formatDateLong', () => {
  it('formats the Home header long date in each language', () => {
    expect(formatDateLong('en', '2026-09-24')).toBe('Thursday, September 24')
    expect(formatDateLong('uk', '2026-09-24')).toBe('Четвер, 24 вересня')
    expect(formatDateLong('ru', '2026-09-24')).toBe('Четверг, 24 сентября')
  })

  it('uses the genitive month form in uk/ru (not the nominative one)', () => {
    // "вересня" (genitive), not "Вересень" (nominative) — matches monG, not monN.
    expect(formatDateLong('uk', '2026-09-24')).toContain('вересня')
    expect(formatDateLong('uk', '2026-09-24')).not.toContain('Вересень')
  })

  it('formats a December → January boundary', () => {
    expect(formatDateLong('en', '2025-12-31')).toBe('Wednesday, December 31')
    expect(formatDateLong('en', '2026-01-01')).toBe('Thursday, January 1')
  })
})

describe('formatMonthYear', () => {
  it('formats the calendar header with the nominative month name', () => {
    expect(formatMonthYear('en', 2026, 8)).toBe('September 2026')
    expect(formatMonthYear('uk', 2026, 8)).toBe('Вересень 2026')
    expect(formatMonthYear('ru', 2026, 8)).toBe('Сентябрь 2026')
  })

  it('handles December (monthIndex 11) and January (monthIndex 0)', () => {
    expect(formatMonthYear('en', 2025, 11)).toBe('December 2025')
    expect(formatMonthYear('en', 2026, 0)).toBe('January 2026')
  })
})

describe('formatMoney', () => {
  it('formats whole hryvnia amounts from minor units with a space thousands separator', () => {
    expect(formatMoney(800000, 'UAH')).toBe('8 000 ₴')
  })

  it('puts the dollar sign before the amount', () => {
    expect(formatMoney(2500, 'USD')).toBe('$25')
  })

  it('puts the euro sign after the amount', () => {
    expect(formatMoney(2500, 'EUR')).toBe('25 €')
  })

  it('keeps a fractional remainder with a comma decimal separator, dropping trailing zero', () => {
    expect(formatMoney(123450, 'UAH')).toBe('1 234,5 ₴')
  })

  it('keeps up to 2 decimals when both are significant', () => {
    expect(formatMoney(999, 'EUR')).toBe('9,99 €')
  })

  it('formats zero', () => {
    expect(formatMoney(0, 'UAH')).toBe('0 ₴')
  })

  it('never uses a non-breaking space as the thousands separator', () => {
    const out = formatMoney(800000, 'UAH')
    expect(out).not.toMatch(/[\u00a0\u202f]/)
  })
})

describe('currencyLabel', () => {
  it('labels UAH as "UAH" in English and "грн" otherwise', () => {
    expect(currencyLabel('en', 'UAH')).toBe('UAH')
    expect(currencyLabel('uk', 'UAH')).toBe('грн')
    expect(currencyLabel('ru', 'UAH')).toBe('грн')
  })

  it('labels USD and EUR the same in every language', () => {
    const currencies: Currency[] = ['USD', 'EUR']
    for (const currency of currencies) {
      for (const lang of LANGS) {
        expect(currencyLabel(lang, currency)).toBe(currency)
      }
    }
  })
})

describe('formatSchedule', () => {
  const sched = (
    entries: Array<[Weekday, HHMM, number]>,
  ): { times: Partial<Record<Weekday, HHMM>>; durs: Partial<Record<Weekday, number>> } => {
    const times: Partial<Record<Weekday, HHMM>> = {}
    const durs: Partial<Record<Weekday, number>> = {}
    for (const [day, time, dur] of entries) {
      times[day] = time
      durs[day] = dur
    }
    return { times, durs }
  }

  it('groups days sharing a time when all durations are equal, duration shown once at the end', () => {
    const { times, durs } = sched([
      [0, '10:00', 60],
      [4, '10:00', 60],
    ])
    expect(formatSchedule('en', times, durs)).toBe('Mo, Fr 10:00 · 60 min')
    expect(formatSchedule('uk', times, durs)).toBe('Пн, Пт 10:00 · 60 хв')
  })

  it('groups by time+duration when durations differ, each group shows its own duration', () => {
    const { times, durs } = sched([
      [0, '10:00', 60],
      [4, '18:00', 90],
    ])
    expect(formatSchedule('en', times, durs)).toBe('Mo 10:00 (60 min) · Fr 18:00 (90 min)')
  })

  it('formats a single day', () => {
    const { times, durs } = sched([[2, '14:30', 45]])
    expect(formatSchedule('en', times, durs)).toBe('We 14:30 · 45 min')
  })

  it('orders groups Monday → Sunday regardless of insertion order, Sunday last', () => {
    const { times, durs } = sched([
      [6, '10:00', 60],
      [0, '10:00', 60],
    ])
    expect(formatSchedule('en', times, durs)).toBe('Mo, Su 10:00 · 60 min')
  })

  it('keeps Sunday as its own trailing group when times differ', () => {
    const { times, durs } = sched([
      [0, '10:00', 60],
      [6, '12:00', 60],
    ])
    expect(formatSchedule('en', times, durs)).toBe('Mo 10:00 · Su 12:00 · 60 min')
  })
})

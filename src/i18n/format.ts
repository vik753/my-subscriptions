import type { Currency, HHMM, ISODate, Weekday } from '../domain'
import { messages, type Language } from './index'

const parts = (date: ISODate) => {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  // Weekday via UTC so the local timezone / DST never shifts it; 0 = Monday.
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
  return { year: y, month: m - 1, day: d, weekday }
}

/** Short date: en "Fri, Sep 25"; uk "пт, 25 вересня"; ru "пт, 25 сентября". */
export function formatDate(lang: Language, date: ISODate): string {
  const L = messages[lang]
  const { month, day, weekday } = parts(date)
  return lang === 'en'
    ? `${L.daysS[weekday]}, ${L.monG[month]} ${day}`
    : `${L.daysS[weekday]}, ${day} ${L.monG[month]}`
}

/** Long date for the Home header: en "Thursday, September 24"; uk "Четвер, 24 вересня". */
export function formatDateLong(lang: Language, date: ISODate): string {
  const L = messages[lang]
  const { month, day, weekday } = parts(date)
  return lang === 'en'
    ? `${L.daysF[weekday]}, ${L.monN[month]} ${day}`
    : `${L.daysF[weekday]}, ${day} ${L.monG[month]}`
}

/** Calendar header: en "September 2026"; uk "Вересень 2026"; ru "Сентябрь 2026". monthIndex 0–11. */
export function formatMonthYear(lang: Language, year: number, monthIndex: number): string {
  return `${messages[lang].monN[monthIndex]} ${year}`
}

const SYMBOL: Record<Currency, string> = { UAH: '₴', USD: '$', EUR: '€' }

/** Money from minor units: "8 000 ₴", "$25", "25 €"; up to 2 decimals with a comma, space thousands. */
export function formatMoney(minor: number, currency: Currency): string {
  const value = (Math.round(minor) / 100)
    .toLocaleString('ru-RU', { maximumFractionDigits: 2 })
    .replace(/[\u00a0\u202f]/g, ' ')
  return currency === 'USD' ? `$${value}` : `${value} ${SYMBOL[currency]}`
}

/** Currency label for inputs: UAH → "UAH" in en, "грн" in uk/ru; USD / EUR as is. */
export function currencyLabel(lang: Language, currency: Currency): string {
  if (currency !== 'UAH') return currency
  return lang === 'en' ? 'UAH' : 'грн'
}

/**
 * Schedule line as unbreakable groups (join with " · "; lines may wrap only between groups).
 * Equal durations: "Mo, Fr 10:00" · "60 min" (days sharing a time are grouped).
 * Different durations: "Mo 10:00 (60 min)" · "Fr 18:00 (90 min)" (grouped by time AND duration).
 */
export function formatScheduleGroups(
  lang: Language,
  times: Partial<Record<Weekday, HHMM>>,
  durs: Partial<Record<Weekday, number>>,
): string[] {
  const L = messages[lang]
  const days = ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).filter((d) => times[d] != null)
  const dur = (d: Weekday) => durs[d] ?? 60
  const sameDuration = new Set(days.map(dur)).size <= 1
  const groups: { key: string; time: HHMM; minutes: number; names: string[] }[] = []
  for (const d of days) {
    const time = times[d] as HHMM
    const key = sameDuration ? time : `${time}|${dur(d)}`
    const group = groups.find((g) => g.key === key)
    if (group) group.names.push(L.days[d] as string)
    else groups.push({ key, time, minutes: dur(d), names: [L.days[d] as string] })
  }
  if (sameDuration) {
    const first = days[0]
    const tail = first === undefined ? [] : [`${dur(first)} ${L.min}`]
    return [...groups.map((g) => `${g.names.join(', ')} ${g.time}`), ...tail]
  }
  return groups.map((g) => `${g.names.join(', ')} ${g.time} (${g.minutes} ${L.min})`)
}

/** The schedule line as plain text, e.g. "Mo, Fr 10:00 · 60 min". */
export const formatSchedule = (
  lang: Language,
  times: Partial<Record<Weekday, HHMM>>,
  durs: Partial<Record<Weekday, number>>,
): string => formatScheduleGroups(lang, times, durs).join(' · ')

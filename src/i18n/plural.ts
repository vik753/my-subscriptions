/** English: 1 → one, else many. */
export const pluralEn = (n: number, one: string, many: string): string => (n === 1 ? one : many)

/** Ukrainian / Russian: 1 · 2–4 · 5+ (11–14 → many). */
export const pluralSlav = (n: number, one: string, few: string, many: string): string => {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}

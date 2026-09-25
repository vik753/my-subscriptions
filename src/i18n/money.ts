/** "8000", "8000.5", "8000,50" → minor units; anything else → null. Empty means free. */
export const parsePrice = (text: string): number | null => {
  if (text === '') return 0
  const m = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(text)
  if (!m) return null
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'))
}

/** Minor units → a plain input value ("8000", "8000.50"), the inverse of `parsePrice`. */
export const priceInput = (minor: number): string =>
  minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2)

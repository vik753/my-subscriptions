import { describe, expect, it } from 'vitest'
import { parsePrice } from './parsePrice'

describe('parsePrice', () => {
  it.each([
    ['', 0],
    ['8000', 800_000],
    ['8000.5', 800_050],
    ['8000,50', 800_050],
    ['0,07', 7],
  ])('%j → %d', (text, minor) => expect(parsePrice(text)).toBe(minor))

  it.each(['1.2.3', ',', '.5', '5.', '5.123', '1,2,3'])('rejects %j', (text) =>
    expect(parsePrice(text)).toBeNull(),
  )
})

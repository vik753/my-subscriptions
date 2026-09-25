import { describe, expect, it } from 'vitest'
import { pluralEn, pluralSlav } from './plural'

describe('pluralEn', () => {
  it('returns the singular form for 1', () => {
    expect(pluralEn(1, 'one', 'many')).toBe('one')
  })

  it('returns the plural form for anything else, including 0', () => {
    expect(pluralEn(0, 'one', 'many')).toBe('many')
    expect(pluralEn(2, 'one', 'many')).toBe('many')
    expect(pluralEn(11, 'one', 'many')).toBe('many')
    expect(pluralEn(21, 'one', 'many')).toBe('many')
  })
})

describe('pluralSlav', () => {
  it('returns "one" when the number ends in 1 but not 11', () => {
    expect(pluralSlav(1, 'one', 'few', 'many')).toBe('one')
    expect(pluralSlav(21, 'one', 'few', 'many')).toBe('one')
    expect(pluralSlav(101, 'one', 'few', 'many')).toBe('one')
  })

  it('returns "few" when the number ends in 2–4 but not 12–14', () => {
    expect(pluralSlav(2, 'one', 'few', 'many')).toBe('few')
    expect(pluralSlav(3, 'one', 'few', 'many')).toBe('few')
    expect(pluralSlav(4, 'one', 'few', 'many')).toBe('few')
    expect(pluralSlav(22, 'one', 'few', 'many')).toBe('few')
    expect(pluralSlav(104, 'one', 'few', 'many')).toBe('few')
  })

  it('returns "many" for 5–20 and any number ending in 11–14 or 0', () => {
    expect(pluralSlav(5, 'one', 'few', 'many')).toBe('many')
    expect(pluralSlav(0, 'one', 'few', 'many')).toBe('many')
    expect(pluralSlav(11, 'one', 'few', 'many')).toBe('many')
    expect(pluralSlav(12, 'one', 'few', 'many')).toBe('many')
    expect(pluralSlav(14, 'one', 'few', 'many')).toBe('many')
    expect(pluralSlav(25, 'one', 'few', 'many')).toBe('many')
    expect(pluralSlav(111, 'one', 'few', 'many')).toBe('many')
    expect(pluralSlav(112, 'one', 'few', 'many')).toBe('many')
  })
})

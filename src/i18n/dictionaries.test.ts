import { describe, expect, it } from 'vitest'
import { dictionaries, LANGUAGES } from './dictionaries'

describe('dictionaries', () => {
  const reference = Object.keys(dictionaries.en).sort()

  it.each(LANGUAGES)('%s has exactly the same keys as en', (lang) => {
    expect(Object.keys(dictionaries[lang]).sort()).toEqual(reference)
  })

  it.each(LANGUAGES)('%s has no empty strings', (lang) => {
    for (const value of Object.values(dictionaries[lang])) expect(value.trim()).not.toBe('')
  })
})

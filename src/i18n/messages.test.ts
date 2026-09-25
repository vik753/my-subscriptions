import { describe, expect, it } from 'vitest'
import { detectLanguage, LANGUAGES, messages, type Language } from './index'

const isEmptyString = (v: unknown): boolean => typeof v === 'string' && v.trim() === ''

const collectEmptyStrings = (value: unknown, path: string, out: string[]): void => {
  if (isEmptyString(value)) {
    out.push(path)
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => collectEmptyStrings(item, `${path}[${i}]`, out))
  } else if (value !== null && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) {
      collectEmptyStrings(v, path ? `${path}.${key}` : key, out)
    }
  }
}

describe('messages: key parity across languages', () => {
  const enKeys = Object.keys(messages.en).sort()

  it('every language has exactly the same top-level keys as en', () => {
    for (const lang of LANGUAGES) {
      expect(Object.keys(messages[lang]).sort()).toEqual(enKeys)
    }
  })

  it('has no empty string values in any language', () => {
    for (const lang of LANGUAGES) {
      const empties: string[] = []
      collectEmptyStrings(messages[lang], '', empties)
      expect(empties).toEqual([])
    }
  })
})

describe('messages: fixed-size lists', () => {
  it('days, daysS and daysF have 7 entries in every language', () => {
    for (const lang of LANGUAGES) {
      expect(messages[lang].days).toHaveLength(7)
      expect(messages[lang].daysS).toHaveLength(7)
      expect(messages[lang].daysF).toHaveLength(7)
    }
  })

  it('monG and monN have 12 entries in every language', () => {
    for (const lang of LANGUAGES) {
      expect(messages[lang].monG).toHaveLength(12)
      expect(messages[lang].monN).toHaveLength(12)
    }
  })
})

describe('messages: plural forms', () => {
  const numbers = [1, 2, 5, 11, 21, 22, 25] as const

  it('pendingCount uses the correct Slavic plural form in uk/ru', () => {
    expect(messages.uk.pendingCount(1)).toBe('1 заняття без позначки')
    expect(messages.uk.pendingCount(2)).toBe('2 заняття без позначки')
    expect(messages.uk.pendingCount(5)).toBe('5 занять без позначки')
    expect(messages.uk.pendingCount(11)).toBe('11 занять без позначки')
    expect(messages.uk.pendingCount(21)).toBe('21 заняття без позначки')
    expect(messages.uk.pendingCount(22)).toBe('22 заняття без позначки')
    expect(messages.uk.pendingCount(25)).toBe('25 занять без позначки')

    expect(messages.ru.pendingCount(1)).toBe('1 занятие без отметки')
    expect(messages.ru.pendingCount(2)).toBe('2 занятия без отметки')
    expect(messages.ru.pendingCount(5)).toBe('5 занятий без отметки')
    expect(messages.ru.pendingCount(11)).toBe('11 занятий без отметки')
    expect(messages.ru.pendingCount(21)).toBe('21 занятие без отметки')
    expect(messages.ru.pendingCount(22)).toBe('22 занятия без отметки')
    expect(messages.ru.pendingCount(25)).toBe('25 занятий без отметки')
  })

  it('pendingCount uses the correct English plural form for 1 and 2', () => {
    expect(messages.en.pendingCount(1)).toBe('1 unmarked session')
    expect(messages.en.pendingCount(2)).toBe('2 unmarked sessions')
  })

  it('remOf uses the correct Slavic plural form in uk/ru', () => {
    expect(messages.uk.remOf(1)).toBe('оплачене заняття залишилось')
    expect(messages.uk.remOf(2)).toBe('оплачені заняття залишилось')
    expect(messages.uk.remOf(5)).toBe('оплачених занять залишилось')
    expect(messages.uk.remOf(11)).toBe('оплачених занять залишилось')
    expect(messages.uk.remOf(21)).toBe('оплачене заняття залишилось')
    expect(messages.uk.remOf(22)).toBe('оплачені заняття залишилось')
    expect(messages.uk.remOf(25)).toBe('оплачених занять залишилось')

    expect(messages.ru.remOf(1)).toBe('оплаченное занятие осталось')
    expect(messages.ru.remOf(2)).toBe('оплаченных занятия осталось')
    expect(messages.ru.remOf(5)).toBe('оплаченных занятий осталось')
    expect(messages.ru.remOf(11)).toBe('оплаченных занятий осталось')
    expect(messages.ru.remOf(21)).toBe('оплаченное занятие осталось')
    expect(messages.ru.remOf(22)).toBe('оплаченных занятия осталось')
    expect(messages.ru.remOf(25)).toBe('оплаченных занятий осталось')
  })

  it('remOf uses the correct English plural form for 1 and 2', () => {
    expect(messages.en.remOf(1)).toBe('paid session left')
    expect(messages.en.remOf(2)).toBe('paid sessions left')
  })

  it('payN uses the correct Slavic plural form in uk/ru', () => {
    expect(messages.uk.payN(1)).toBe('1 заняття')
    expect(messages.uk.payN(2)).toBe('2 заняття')
    expect(messages.uk.payN(5)).toBe('5 занять')
    expect(messages.uk.payN(11)).toBe('11 занять')
    expect(messages.uk.payN(21)).toBe('21 заняття')
    expect(messages.uk.payN(22)).toBe('22 заняття')
    expect(messages.uk.payN(25)).toBe('25 занять')

    expect(messages.ru.payN(1)).toBe('1 занятие')
    expect(messages.ru.payN(2)).toBe('2 занятия')
    expect(messages.ru.payN(5)).toBe('5 занятий')
    expect(messages.ru.payN(11)).toBe('11 занятий')
    expect(messages.ru.payN(21)).toBe('21 занятие')
    expect(messages.ru.payN(22)).toBe('22 занятия')
    expect(messages.ru.payN(25)).toBe('25 занятий')
  })

  it('payN uses the correct English plural form for 1 and 2', () => {
    expect(messages.en.payN(1)).toBe('1 session')
    expect(messages.en.payN(2)).toBe('2 sessions')
  })

  it('covers all requested sample numbers for every function tested', () => {
    // Sanity check that the fixture list matches the spec's sample set.
    expect(numbers).toEqual([1, 2, 5, 11, 21, 22, 25])
  })
})

describe('detectLanguage', () => {
  it('maps a region-qualified uk tag to uk', () => {
    expect(detectLanguage(['uk-UA'])).toBe('uk')
  })

  it('maps a bare ru tag to ru', () => {
    expect(detectLanguage(['ru'])).toBe('ru')
  })

  it('falls back to en when no preferred tag is supported', () => {
    expect(detectLanguage(['de-DE', 'en-GB'])).toBe('en')
    expect(detectLanguage(['fr'])).toBe('en')
  })

  it('falls back to en for an empty preference list', () => {
    expect(detectLanguage([])).toBe('en')
  })

  it('only returns known languages', () => {
    for (const tag of ['uk-UA', 'ru-RU', 'en-US', 'fr-FR', '']) {
      expect(LANGUAGES).toContain(detectLanguage([tag]) as Language)
    }
  })
})

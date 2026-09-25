import { en, type Messages } from './messages/en'
import { ru } from './messages/ru'
import { uk } from './messages/uk'

export type Language = 'uk' | 'en' | 'ru'
export type { Messages }

export const LANGUAGES: readonly Language[] = ['uk', 'en', 'ru']

/** Brand name — not translated. */
export const APP_NAME = 'My Subscriptions'

export const messages: Record<Language, Messages> = { en, uk, ru }

/** Language from the browser (`uk-UA` → uk), falling back to English. */
export const detectLanguage = (preferred: readonly string[]): Language => {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0]
    if (base === 'uk' || base === 'ru' || base === 'en') return base
  }
  return 'en'
}

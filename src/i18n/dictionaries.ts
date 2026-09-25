export type Language = 'uk' | 'en' | 'ru'

export const LANGUAGES: readonly Language[] = ['uk', 'en', 'ru']

// Keys are typed from the English dictionary; the other languages must provide exactly the same keys.
const en = {
  appName: 'My Subscriptions',
  appTagline: 'Track class passes and paid sessions',
}

export type MessageKey = keyof typeof en

export const dictionaries: Record<Language, Record<MessageKey, string>> = {
  en,
  uk: {
    appName: 'My Subscriptions',
    appTagline: 'Облік абонементів і оплачених занять',
  },
  ru: {
    appName: 'My Subscriptions',
    appTagline: 'Учёт абонементов и оплаченных занятий',
  },
}

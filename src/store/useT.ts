import { messages, type Language, type Messages } from '../i18n'
import { useApp } from './appStore'

/** Messages for the current language. */
export const useT = (): Messages => useApp((s) => messages[s.data.settings.language])

export const useLanguage = (): Language => useApp((s) => s.data.settings.language)

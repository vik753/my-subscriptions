import { dictionaries, type Language, type MessageKey } from './dictionaries'

export function translate(lang: Language, key: MessageKey): string {
  return dictionaries[lang][key]
}

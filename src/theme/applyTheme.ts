import type { Language } from '../i18n'
import type { Mode, Scheme } from './types'

// `--color-bg` of each scheme converted from OKLCH to hex — <meta name="theme-color"> needs a
// color every browser understands (tint of the iOS status bar / Android toolbar).
const BG: Record<Scheme, Record<Mode, string>> = {
  nocturne: { dark: '#141520', light: '#f1f3fd' },
  sea: { dark: '#091820', light: '#eaf5fd' },
  clay: { dark: '#1c140f', light: '#f9f2ed' },
  graphite: { dark: '#161616', light: '#f3f3f3' },
}

export function applyTheme(
  scheme: Scheme,
  mode: Mode,
  lang: Language,
  doc: Document = document,
): void {
  const root = doc.documentElement
  root.dataset.scheme = scheme
  root.dataset.mode = mode
  root.lang = lang
  doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', BG[scheme][mode])
}

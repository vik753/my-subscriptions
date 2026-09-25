import { describe, expect, it } from 'vitest'
import { applyTheme } from './applyTheme'

describe('applyTheme', () => {
  it('sets scheme, mode, language and the browser theme color', () => {
    document.head.innerHTML = '<meta name="theme-color" content="#000000" />'
    applyTheme('sea', 'light', 'uk')
    const root = document.documentElement
    expect(root.dataset.scheme).toBe('sea')
    expect(root.dataset.mode).toBe('light')
    expect(root.lang).toBe('uk')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#eaf5fd',
    )
  })

  it('works without a theme-color meta tag', () => {
    document.head.innerHTML = ''
    applyTheme('clay', 'dark', 'ru')
    expect(document.documentElement.dataset.scheme).toBe('clay')
  })
})

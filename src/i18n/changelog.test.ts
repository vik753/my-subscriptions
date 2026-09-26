import { describe, expect, it } from 'vitest'
import md from '../../CHANGELOG.md?raw'
import { CHANGELOG } from './changelog'
import { LANGUAGES } from './index'

const semver = (v: string) => v.split('.').map(Number)
const newer = (a: string, b: string) => {
  const [x, y] = [semver(a), semver(b)]
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0)
  return false
}

describe('CHANGELOG', () => {
  it('starts with the package version', () => {
    expect(CHANGELOG[0]?.version).toBe(__APP_VERSION__)
  })

  it('lists releases newest first, with valid versions and dates', () => {
    CHANGELOG.forEach((r, i) => {
      expect(r.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      const prev = CHANGELOG[i - 1]
      if (prev) {
        expect(newer(prev.version, r.version)).toBe(true)
        expect(prev.date >= r.date).toBe(true)
      }
    })
  })

  it('has the same number of non-empty notes in every language', () => {
    for (const r of CHANGELOG) {
      const count = r.notes.en.length
      expect(count).toBeGreaterThan(0)
      for (const lang of LANGUAGES) {
        expect(r.notes[lang]).toHaveLength(count)
        r.notes[lang].forEach((n) => expect(n.trim()).not.toBe(''))
      }
    }
  })

  it('every release is also in CHANGELOG.md', () => {
    for (const r of CHANGELOG) expect(md).toContain(`## [${r.version}] — ${r.date}`)
  })
})

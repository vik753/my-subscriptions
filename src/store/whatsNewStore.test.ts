import { beforeEach, describe, expect, it } from 'vitest'
import { useWhatsNew } from './whatsNewStore'

const KEY = 'ui.seenVersion'

beforeEach(() => {
  localStorage.clear()
  useWhatsNew.setState({ announce: null })
})

describe('whatsNew', () => {
  it('a fresh install announces nothing and remembers the version', () => {
    useWhatsNew.getState().init('1.3.0', false)
    expect(useWhatsNew.getState().announce).toBeNull()
    expect(localStorage.getItem(KEY)).toBe('1.3.0')
  })

  it('a user from before the changelog (has hobbies) gets the note once', () => {
    useWhatsNew.getState().init('1.3.0', true)
    expect(useWhatsNew.getState().announce).toBe('1.3.0')
    useWhatsNew.getState().seen()
    expect(useWhatsNew.getState().announce).toBeNull()
    useWhatsNew.getState().init('1.3.0', true)
    expect(useWhatsNew.getState().announce).toBeNull()
  })

  it('announces a new version after an update, not the same one again', () => {
    localStorage.setItem(KEY, '1.2.1')
    useWhatsNew.getState().init('1.3.0', true)
    expect(useWhatsNew.getState().announce).toBe('1.3.0')
    expect(localStorage.getItem(KEY)).toBe('1.2.1')
  })

  it('a version without changelog notes is remembered silently', () => {
    localStorage.setItem(KEY, '1.2.1')
    useWhatsNew.getState().init('9.9.9', true)
    expect(useWhatsNew.getState().announce).toBeNull()
    expect(localStorage.getItem(KEY)).toBe('9.9.9')
  })

  it('seen without a note changes nothing', () => {
    useWhatsNew.getState().seen()
    expect(localStorage.getItem(KEY)).toBeNull()
  })
})

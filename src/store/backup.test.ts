import { describe, expect, it } from 'vitest'
import { mergeState, readBackup, sameState } from './backup'
import { defaultState } from './persistence/migrate'
import type { PersistedState } from './types'

const hobby = (id: string, updatedAt: string) => ({
  id,
  name: id,
  start: '2026-09-07',
  sched: [{ from: '2026-09-07', times: { 0: '10:00' }, durs: { 0: 60 } }],
  payments: [],
  currency: 'UAH' as const,
  marks: {},
  moves: {},
  updatedAt,
  google: { calendar: false, backup: false },
})

const state = (patch: Partial<PersistedState>): PersistedState => ({
  ...defaultState('en'),
  ...patch,
})

describe('mergeState', () => {
  it('takes settings from the copy changed last', () => {
    const local = state({
      settings: { ...defaultState('en').settings, scheme: 'sea' },
      settingsUpdatedAt: '2026-09-01',
    })
    const remote = state({
      settings: { ...defaultState('uk').settings, scheme: 'clay' },
      settingsUpdatedAt: '2026-09-02',
    })
    expect(mergeState(local, remote)).toMatchObject({
      settings: { scheme: 'clay', language: 'uk' },
      settingsUpdatedAt: '2026-09-02',
    })
    expect(mergeState(remote, local).settings.scheme).toBe('clay')
  })

  it('keeps the later snooze per hobby and drops snoozes of deleted hobbies', () => {
    const base = defaultState('en').settings
    const local = state({
      hobbies: [hobby('a', '2026-09-01'), hobby('b', '2026-09-01')],
      settings: {
        ...base,
        renewSnoozedUntil: { a: '2026-09-25', b: '2026-09-20', gone: '2026-09-30' },
      },
    })
    const remote = state({
      hobbies: [hobby('a', '2026-09-01'), hobby('b', '2026-09-01')],
      settings: { ...base, renewSnoozedUntil: { a: '2026-09-21', b: '2026-09-26' } },
    })
    expect(mergeState(local, remote).settings.renewSnoozedUntil).toEqual({
      a: '2026-09-25',
      b: '2026-09-26',
    })
  })

  it('merges hobbies per hobby with tombstones', () => {
    const local = state({ hobbies: [hobby('a', '2026-09-01'), hobby('b', '2026-09-01')] })
    const remote = state({
      hobbies: [hobby('c', '2026-09-02')],
      deletedHobbies: { b: '2026-09-03' },
    })
    const merged = mergeState(local, remote)
    expect(merged.hobbies.map((h) => h.id)).toEqual(['a', 'c'])
    expect(merged.deletedHobbies).toEqual({ b: '2026-09-03' })
  })
})

describe('readBackup', () => {
  it('migrates the state and keeps the calendar id', () => {
    expect(readBackup({ schemaVersion: 1, hobbies: [], calendarId: 'cal1' }, 'en')).toMatchObject({
      schemaVersion: 3,
      settingsUpdatedAt: '',
      calendarId: 'cal1',
    })
    expect(readBackup({ schemaVersion: 2 }, 'en').calendarId).toBeNull()
  })

  it('refuses a newer schema', () => {
    expect(() => readBackup({ schemaVersion: 99 }, 'en')).toThrow()
  })
})

describe('sameState', () => {
  it('ignores key order', () => {
    const a = defaultState('en')
    const b = JSON.parse(
      JSON.stringify(Object.fromEntries(Object.entries(a).reverse())),
    ) as PersistedState
    expect(sameState(a, b)).toBe(true)
    expect(sameState(a, { ...a, settingsUpdatedAt: 'x' })).toBe(false)
  })
})

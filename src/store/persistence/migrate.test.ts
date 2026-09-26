import { describe, expect, it } from 'vitest'
import type { Hobby } from '../../domain'
import { defaultState, migrate } from './migrate'
import { SCHEMA_VERSION, type PersistedState, type Settings } from '../types'

const makeSettings = (overrides: Partial<Settings> = {}): Settings => ({
  language: 'en',
  scheme: 'nocturne',
  mode: 'dark',
  reminderMinutes: 0,
  renewSnoozedUntil: {},
  ...overrides,
})

const makeHobby = (overrides: Partial<Hobby> = {}): Hobby => ({
  id: 'h1',
  name: 'Swimming',
  start: '2026-09-01',
  sched: [],
  payments: [],
  currency: 'UAH',
  marks: {},
  moves: {},
  updatedAt: '2026-09-01T00:00:00.000Z',
  google: { calendar: false, backup: false, guests: [], paidColor: '10' },
  ...overrides,
})

/** A hobby as stored before schema v3 (no `google` flags). */
const withoutGoogle = (h: Hobby): Partial<Hobby> => {
  const copy: Partial<Hobby> = { ...h }
  delete copy.google
  return copy
}

const makeRaw = (overrides: Partial<PersistedState> = {}): PersistedState => ({
  schemaVersion: SCHEMA_VERSION,
  hobbies: [],
  settings: makeSettings(),
  settingsUpdatedAt: '2026-09-01T00:00:00.000Z',
  deletedHobbies: {},
  ...overrides,
})

describe('defaultState', () => {
  it('is empty, with nocturne/dark theme, reminders off and no snoozes', () => {
    expect(defaultState('en')).toEqual({
      schemaVersion: SCHEMA_VERSION,
      hobbies: [],
      settings: {
        language: 'en',
        scheme: 'nocturne',
        mode: 'dark',
        reminderMinutes: 0,
        renewSnoozedUntil: {},
      },
      settingsUpdatedAt: '',
      deletedHobbies: {},
    })
  })

  it('carries through the requested language', () => {
    expect(defaultState('uk').settings.language).toBe('uk')
    expect(defaultState('ru').settings.language).toBe('ru')
  })
})

describe('migrate: missing or unrecognizable stored data', () => {
  it('falls back to defaultState for null', () => {
    expect(migrate(null, 'en')).toEqual(defaultState('en'))
  })

  it('falls back to defaultState for undefined', () => {
    expect(migrate(undefined, 'uk')).toEqual(defaultState('uk'))
  })

  it('falls back to defaultState for a non-object value', () => {
    expect(migrate('not an object', 'en')).toEqual(defaultState('en'))
    expect(migrate(42, 'en')).toEqual(defaultState('en'))
    expect(migrate(['array'], 'en')).toEqual(defaultState('en'))
  })

  it('falls back to defaultState when schemaVersion is missing or not numeric', () => {
    expect(migrate({ hobbies: [], settings: {} }, 'en')).toEqual(defaultState('en'))
    expect(migrate({ schemaVersion: '1', hobbies: [], settings: {} }, 'en')).toEqual(
      defaultState('en'),
    )
  })
})

describe('migrate: current schema version', () => {
  it('returns fully-populated data unchanged', () => {
    const hobby = makeHobby()
    const raw = makeRaw({
      hobbies: [hobby],
      settings: makeSettings({ language: 'ru', scheme: 'sea', mode: 'light', reminderMinutes: 30 }),
      deletedHobbies: { h2: '2026-09-01T00:00:00.000Z' },
    })
    expect(migrate(raw, 'en')).toEqual(raw)
  })

  it('fills missing hobbies with an empty array', () => {
    const raw = { schemaVersion: SCHEMA_VERSION, settings: makeSettings() }
    expect(migrate(raw, 'en').hobbies).toEqual([])
  })

  it('fills missing deletedHobbies with an empty object', () => {
    const raw = { schemaVersion: SCHEMA_VERSION, hobbies: [], settings: makeSettings() }
    expect(migrate(raw, 'en').deletedHobbies).toEqual({})
  })

  it('fills missing settings entirely from defaults', () => {
    const raw = { schemaVersion: SCHEMA_VERSION, hobbies: [], deletedHobbies: {} }
    expect(migrate(raw, 'uk').settings).toEqual(defaultState('uk').settings)
  })

  it('fills individually missing settings fields from defaults', () => {
    const raw = makeRaw({
      settings: { language: 'ru' } as unknown as Settings,
    })
    const result = migrate(raw, 'en')
    expect(result.settings).toEqual({
      language: 'ru',
      scheme: 'nocturne',
      mode: 'dark',
      reminderMinutes: 0,
      renewSnoozedUntil: {},
    })
  })

  it('replaces an invalid reminderMinutes with the default', () => {
    const raw = makeRaw({ settings: makeSettings({ reminderMinutes: 999 as unknown as 0 }) })
    expect(migrate(raw, 'en').settings.reminderMinutes).toBe(0)
  })

  it('replaces an invalid scheme with the default', () => {
    const raw = makeRaw({
      settings: makeSettings({ scheme: 'not-a-scheme' as unknown as 'nocturne' }),
    })
    expect(migrate(raw, 'en').settings.scheme).toBe('nocturne')
  })

  it('falls back to the given language when the stored language is unrecognized', () => {
    const raw = makeRaw({ settings: makeSettings({ language: 'fr' as unknown as 'en' }) })
    expect(migrate(raw, 'ru').settings.language).toBe('ru')
  })

  it('does not mutate the input it was given', () => {
    const raw = makeRaw({ hobbies: [makeHobby()] })
    const snapshot = JSON.parse(JSON.stringify(raw))
    migrate(raw, 'en')
    expect(raw).toEqual(snapshot)
  })
})

describe('migrate: newer schema version', () => {
  it('throws rather than silently dropping data from a newer app version', () => {
    const raw = makeRaw({ schemaVersion: (SCHEMA_VERSION + 1) as typeof SCHEMA_VERSION })
    expect(() => migrate(raw, 'en')).toThrow()
  })
})

describe('migrate: v1 → v2', () => {
  it('adds settingsUpdatedAt as never changed and keeps everything else', () => {
    const hobby = withoutGoogle(makeHobby())
    const v1 = {
      schemaVersion: 1,
      hobbies: [hobby],
      settings: makeSettings({ language: 'uk', reminderMinutes: 15 }),
      deletedHobbies: { h2: '2026-09-01T00:00:00.000Z' },
    }
    expect(migrate(v1, 'en')).toEqual({
      schemaVersion: 4,
      hobbies: [
        { ...makeHobby(), google: { calendar: true, backup: true, guests: [], paidColor: '10' } },
      ],
      settings: makeSettings({ language: 'uk', reminderMinutes: 15 }),
      settingsUpdatedAt: '',
      deletedHobbies: { h2: '2026-09-01T00:00:00.000Z' },
    })
  })

  it('replaces a non-string settingsUpdatedAt with never', () => {
    expect(migrate({ ...makeRaw(), settingsUpdatedAt: 5 }, 'en').settingsUpdatedAt).toBe('')
  })
})

describe('migrate: v2 → v3', () => {
  it('keeps Calendar and Drive on for hobbies created before the option existed', () => {
    const v2 = { ...makeRaw(), schemaVersion: 2, hobbies: [withoutGoogle(makeHobby())] }
    expect(migrate(v2, 'en').hobbies[0]?.google).toMatchObject({ calendar: true, backup: true })
  })

  it('reads v3 flags and treats missing ones as off (local only)', () => {
    const v3 = {
      ...makeRaw(),
      hobbies: [
        makeHobby({ google: { calendar: true, backup: false, guests: [], paidColor: '10' } }),
        withoutGoogle(makeHobby({ id: 'b' })),
      ],
    }
    expect(migrate(v3, 'en').hobbies.map((h) => h.google)).toMatchObject([
      { calendar: true, backup: false },
      { calendar: false, backup: false },
    ])
  })
})

describe('migrate: v3 → v4', () => {
  it('adds no guests and Basil (the old green) to existing hobbies', () => {
    const v3hobby = { ...makeHobby(), google: { calendar: true, backup: false } }
    const v3 = { ...makeRaw(), schemaVersion: 3, hobbies: [v3hobby] }
    expect(migrate(v3, 'en').hobbies[0]?.google).toEqual({
      calendar: true,
      backup: false,
      guests: [],
      paidColor: '10',
    })
  })

  it('keeps valid guests and color, drops junk', () => {
    const hobby = {
      ...makeHobby(),
      google: { calendar: true, backup: true, guests: ['a@b.co', 5], paidColor: '42' },
    }
    expect(migrate({ ...makeRaw(), hobbies: [hobby] }, 'en').hobbies[0]?.google).toEqual({
      calendar: true,
      backup: true,
      guests: ['a@b.co'],
      paidColor: '10',
    })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { markSession } from '../domain'
import { appClock, flushWrites, resetAppStore, useApp } from './appStore'
import { createMemoryStorage, type StateStorage } from './persistence/storage'
import { SCHEMA_VERSION } from './types'

const initial = useApp.getState()
const NEW_HOBBY = {
  id: 'gym',
  name: 'Gym',
  start: '2026-09-07',
  times: { 0: '10:00' },
  durs: { 0: 60 },
  currency: 'UAH' as const,
  sessions: 8,
  price: 800_000,
  paymentDate: '2026-09-05',
}

beforeEach(() => {
  resetAppStore(initial)
  vi.spyOn(appClock, 'nowIso').mockReturnValue('2026-09-24T07:02:00.000Z')
})

describe('appStore.load', () => {
  it('starts with defaults in the detected language when nothing is stored', async () => {
    await useApp.getState().load(createMemoryStorage(), 'uk')
    const { ready, data } = useApp.getState()
    expect(ready).toBe(true)
    expect(data.hobbies).toEqual([])
    expect(data.settings).toMatchObject({ language: 'uk', scheme: 'nocturne', mode: 'dark' })
  })

  it('restores stored data', async () => {
    const storage = createMemoryStorage()
    await useApp.getState().load(storage, 'en')
    useApp.getState().addHobby(NEW_HOBBY)
    await flushWrites()

    resetAppStore(initial)
    await useApp.getState().load(storage, 'en')
    expect(useApp.getState().data.hobbies.map((h) => h.id)).toEqual(['gym'])
  })

  it('refuses to touch data written by a newer app version', async () => {
    const storage = createMemoryStorage({ schemaVersion: SCHEMA_VERSION + 1, hobbies: [] })
    await useApp.getState().load(storage, 'en')
    expect(useApp.getState().loadError).toMatch(/schema/)
    useApp.getState().updateSettings({ mode: 'light' })
    await flushWrites()
    expect(storage.value).toEqual({ schemaVersion: SCHEMA_VERSION + 1, hobbies: [] })
  })
})

describe('appStore.load — races', () => {
  it('ignores changes made before loading finishes (never overwrites newer-schema data)', async () => {
    const newer = { schemaVersion: SCHEMA_VERSION + 1, hobbies: [{ id: 'future' }] }
    const storage = createMemoryStorage(newer)
    const loading = useApp.getState().load(storage, 'en')
    useApp.getState().updateSettings({ mode: 'light' })
    await loading
    await flushWrites()
    expect(storage.value).toEqual(newer)
  })

  it('does not lose a change made during a normal load', async () => {
    const storage = createMemoryStorage()
    const loading = useApp.getState().load(storage, 'en')
    useApp.getState().updateSettings({ mode: 'light' })
    await loading
    await flushWrites()
    // The early change was ignored, so memory and storage agree.
    expect(useApp.getState().data.settings.mode).toBe('dark')
    expect(storage.value).toBeUndefined()
  })

  it('loads only once per launch', async () => {
    const storage = createMemoryStorage()
    const load = vi.spyOn(storage, 'load')
    await Promise.all([
      useApp.getState().load(storage, 'en'),
      useApp.getState().load(storage, 'en'),
    ])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('reports non-Error load failures as text', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const broken: StateStorage = {
      load: () => Promise.reject('disk gone'),
      save: () => Promise.resolve(),
      clear: () => Promise.resolve(),
    }
    await useApp.getState().load(broken, 'en')
    expect(useApp.getState().loadError).toBe('disk gone')
    expect(warn).toHaveBeenCalled()
  })
})

describe('appStore changes', () => {
  let storage: ReturnType<typeof createMemoryStorage>

  beforeEach(async () => {
    storage = createMemoryStorage()
    await useApp.getState().load(storage, 'en')
  })

  it('persists settings changes', async () => {
    useApp.getState().updateSettings({ scheme: 'sea', mode: 'light' })
    await flushWrites()
    expect(storage.value).toMatchObject({
      settings: { scheme: 'sea', mode: 'light', language: 'en' },
    })
  })

  it('stamps updatedAt on new and changed hobbies', async () => {
    useApp.getState().addHobby(NEW_HOBBY)
    expect(useApp.getState().data.hobbies[0]?.updatedAt).toBe('2026-09-24T07:02:00.000Z')

    vi.mocked(appClock.nowIso).mockReturnValue('2026-09-25T08:00:00.000Z')
    useApp.getState().updateHobby('gym', (h) => markSession(h, '2026-09-07', 'attended'))
    const hobby = useApp.getState().data.hobbies[0]
    expect(hobby?.marks).toEqual({ '2026-09-07': 'attended' })
    expect(hobby?.updatedAt).toBe('2026-09-25T08:00:00.000Z')
  })

  it('leaves other hobbies untouched when updating one', () => {
    useApp.getState().addHobby(NEW_HOBBY)
    useApp.getState().addHobby({ ...NEW_HOBBY, id: 'eng' })
    const before = useApp.getState().data.hobbies[1]
    useApp.getState().updateHobby('gym', (h) => ({ ...h, name: 'Gym 2' }))
    expect(useApp.getState().data.hobbies[1]).toBe(before)
  })

  it('deletes a hobby with a tombstone and drops its renewal snooze', async () => {
    useApp.getState().addHobby(NEW_HOBBY)
    useApp
      .getState()
      .updateSettings({ renewSnoozedUntil: { gym: '2026-09-25', eng: '2026-09-26' } })
    useApp.getState().deleteHobby('gym')
    await flushWrites()
    const { data } = useApp.getState()
    expect(data.hobbies).toEqual([])
    expect(data.deletedHobbies).toEqual({ gym: '2026-09-24T07:02:00.000Z' })
    expect(data.settings.renewSnoozedUntil).toEqual({ eng: '2026-09-26' })
    expect(storage.value).toMatchObject({ deletedHobbies: { gym: '2026-09-24T07:02:00.000Z' } })
  })

  it('keeps writes in order even when an earlier save is slower', async () => {
    const saved: string[] = []
    let first = true
    const slow: StateStorage = {
      load: () => Promise.resolve(undefined),
      clear: () => Promise.resolve(),
      save: async (state) => {
        if (first) {
          first = false
          await new Promise((r) => setTimeout(r, 20))
        }
        saved.push(state.settings.mode)
      },
    }
    resetAppStore(initial)
    await useApp.getState().load(slow, 'en')
    useApp.getState().updateSettings({ mode: 'light' })
    useApp.getState().updateSettings({ mode: 'dark' })
    await flushWrites()
    expect(saved).toEqual(['light', 'dark'])
  })

  it('logs and survives a failed save', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failing: StateStorage = {
      load: () => Promise.resolve(undefined),
      clear: () => Promise.resolve(),
      save: () => Promise.reject(new Error('quota')),
    }
    resetAppStore(initial)
    await useApp.getState().load(failing, 'en')
    useApp.getState().updateSettings({ mode: 'light' })
    await flushWrites()
    expect(error).toHaveBeenCalled()
    expect(useApp.getState().data.settings.mode).toBe('light')
  })
})

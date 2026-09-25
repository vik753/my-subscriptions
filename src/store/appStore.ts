import { create } from 'zustand'
import { createHobby, type Hobby, type NewHobbyInput } from '../domain'
import type { Language } from '../i18n'
import { migrate, defaultState } from './persistence/migrate'
import type { StateStorage } from './persistence/storage'
import type { PersistedState, Settings } from './types'

export interface AppState {
  /** False until `load` finished; screens render a splash until then. */
  ready: boolean
  loadError: string | null
  data: PersistedState
  load: (storage: StateStorage, language: Language) => Promise<void>
  updateSettings: (patch: Partial<Settings>) => void
  addHobby: (input: Omit<NewHobbyInput, 'updatedAt'>) => Hobby
  /** Applies a pure domain mutation and stamps `updatedAt`. */
  updateHobby: (id: string, mutate: (hobby: Hobby) => Hobby) => void
  deleteHobby: (id: string) => void
}

/** Seam for tests. */
export const appClock = { nowIso: () => new Date().toISOString() }

let storage: StateStorage | null = null
// load() runs once per app launch (StrictMode double effects, repeated calls).
let loading: Promise<void> | null = null
// Writes are chained so a slow earlier save can never overwrite a newer one.
let writes: Promise<void> = Promise.resolve()

const persist = (data: PersistedState) => {
  const target = storage
  if (!target) return
  // TODO(stage 9): feed save failures into the sync status UI.
  writes = writes
    .then(() => target.save(data))
    .catch((e: unknown) => console.error('save failed', e))
}

/** Test helper: detach storage and reset state so `load` can run again. */
export const resetAppStore = (initial: AppState) => {
  storage = null
  loading = null
  writes = Promise.resolve()
  useApp.setState(initial, true)
}

/** Resolves when every queued write has reached storage (tests, before sync/backup). */
export const flushWrites = () => writes

export const useApp = create<AppState>((set, get) => {
  const commit = (next: PersistedState) => {
    // Changes before load finishes would be overwritten (or overwrite newer-schema data) — ignore them.
    if (!get().ready) return
    set({ data: next })
    persist(next)
  }

  return {
    ready: false,
    loadError: null,
    data: defaultState('en'),

    load: (target, language) => {
      loading ??= (async () => {
        try {
          const data = migrate(await target.load(), language)
          storage = target
          set({ data, ready: true, loadError: null })
        } catch (e) {
          // Storage stays detached: data from a newer app version must never be overwritten.
          const message = e instanceof Error ? e.message : String(e)
          console.warn('load failed; changes will not be saved', message)
          set({ data: defaultState(language), ready: true, loadError: message })
        }
      })()
      return loading
    },

    updateSettings: (patch) => {
      const { data } = get()
      commit({ ...data, settings: { ...data.settings, ...patch } })
    },

    addHobby: (input) => {
      const hobby = createHobby({ ...input, updatedAt: appClock.nowIso() })
      const { data } = get()
      commit({ ...data, hobbies: [...data.hobbies, hobby] })
      return hobby
    },

    updateHobby: (id, mutate) => {
      const { data } = get()
      const updatedAt = appClock.nowIso()
      commit({
        ...data,
        hobbies: data.hobbies.map((h) => (h.id === id ? { ...mutate(h), updatedAt } : h)),
      })
    },

    deleteHobby: (id) => {
      const { data } = get()
      const renewSnoozedUntil = Object.fromEntries(
        Object.entries(data.settings.renewSnoozedUntil).filter(([key]) => key !== id),
      )
      commit({
        ...data,
        hobbies: data.hobbies.filter((h) => h.id !== id),
        deletedHobbies: { ...data.deletedHobbies, [id]: appClock.nowIso() },
        settings: { ...data.settings, renewSnoozedUntil },
      })
    },
  }
})

import { openDB } from 'idb'
import type { PersistedState } from '../types'

export interface StateStorage {
  /** Raw stored value (pass through `migrate`), or undefined when nothing is stored yet. */
  load: () => Promise<unknown>
  save: (state: PersistedState) => Promise<void>
  clear: () => Promise<void>
}

const DB_NAME = 'my-subscriptions'
const STORE = 'state'
const KEY = 'app'

/** Single-document IndexedDB storage — app data never goes to localStorage. */
export const createIdbStorage = (): StateStorage => {
  const db = openDB(DB_NAME, 1, {
    upgrade: (database, oldVersion) => {
      if (oldVersion < 1) database.createObjectStore(STORE)
    },
  })
  return {
    load: async () => (await db).get(STORE, KEY),
    save: async (state) => {
      await (await db).put(STORE, state, KEY)
    },
    clear: async () => {
      await (await db).delete(STORE, KEY)
    },
  }
}

/** In-memory storage for tests. */
export const createMemoryStorage = (initial?: unknown): StateStorage & { value: unknown } => {
  const storage = {
    value: initial,
    load: () => Promise.resolve(structuredClone(storage.value)),
    save: (state: PersistedState) => {
      storage.value = structuredClone(state)
      return Promise.resolve()
    },
    clear: () => {
      storage.value = undefined
      return Promise.resolve()
    },
  }
  return storage
}

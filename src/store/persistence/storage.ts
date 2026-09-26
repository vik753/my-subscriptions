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

/** A second small document next to the app state (local-only sync bookkeeping). */
export interface MetaStorage {
  load: () => Promise<unknown>
  save: (value: unknown) => Promise<void>
  clear: () => Promise<void>
}

export const createIdbMeta = (key: string): MetaStorage => {
  const db = openDB(DB_NAME, 1, {
    upgrade: (database, oldVersion) => {
      if (oldVersion < 1) database.createObjectStore(STORE)
    },
  })
  return {
    load: async () => (await db).get(STORE, key),
    save: async (value) => {
      await (await db).put(STORE, value, key)
    },
    clear: async () => {
      await (await db).delete(STORE, key)
    },
  }
}

export const createMemoryMeta = (initial?: unknown): MetaStorage & { value: unknown } => {
  const meta = {
    value: initial,
    load: () => Promise.resolve(structuredClone(meta.value)),
    save: (value: unknown) => {
      meta.value = structuredClone(value)
      return Promise.resolve()
    },
    clear: () => {
      meta.value = undefined
      return Promise.resolve()
    },
  }
  return meta
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

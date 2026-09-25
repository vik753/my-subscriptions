import { mergeHobbies } from '../domain'
import type { Language } from '../i18n'
import { migrate } from './persistence/migrate'
import type { PersistedState, Settings } from './types'

/** state.json in Drive appDataFolder: the app state plus the account's calendar id. */
export interface BackupDoc extends PersistedState {
  calendarId: string | null
}

/** Reads a downloaded backup; throws for a newer schema (never overwrite what we can't read). */
export const readBackup = (raw: unknown, language: Language): BackupDoc => {
  const calendarId =
    typeof raw === 'object' &&
    raw !== null &&
    'calendarId' in raw &&
    typeof raw.calendarId === 'string'
      ? raw.calendarId
      : null
  return { ...migrate(raw, language), calendarId }
}

const mergeSnoozes = (a: Settings['renewSnoozedUntil'], b: Settings['renewSnoozedUntil']) => {
  const out = { ...a }
  for (const [id, until] of Object.entries(b)) if (!(out[id] && out[id] >= until)) out[id] = until
  return out
}

/**
 * This device's state merged with the backup: hobbies per hobby (domain rule), settings from the
 * copy changed last, snoozes per hobby (the later date).
 */
export const mergeState = (local: PersistedState, remote: PersistedState): PersistedState => {
  const hobbies = mergeHobbies(local, remote)
  const newer = remote.settingsUpdatedAt > local.settingsUpdatedAt ? remote : local
  const snoozes = mergeSnoozes(local.settings.renewSnoozedUntil, remote.settings.renewSnoozedUntil)
  const alive = new Set(hobbies.hobbies.map((h) => h.id))
  return {
    schemaVersion: local.schemaVersion,
    hobbies: hobbies.hobbies,
    deletedHobbies: hobbies.deletedHobbies,
    settings: {
      ...newer.settings,
      renewSnoozedUntil: Object.fromEntries(
        Object.entries(snoozes).filter(([id]) => alive.has(id)),
      ),
    },
    settingsUpdatedAt: newer.settingsUpdatedAt,
  }
}

/** Same content, ignoring key order differences from JSON round trips. */
export const sameState = (a: PersistedState, b: PersistedState): boolean => stable(a) === stable(b)

const stable = (value: unknown): string =>
  JSON.stringify(value, (_k, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => x.localeCompare(y)))
      : v,
  )

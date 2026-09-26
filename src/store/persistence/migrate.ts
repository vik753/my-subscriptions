import { LANGUAGES, type Language } from '../../i18n'
import { MODES, SCHEMES } from '../../theme/types'
import { SCHEMA_VERSION, type PersistedState, type Settings } from '../types'

const REMINDERS: readonly Settings['reminderMinutes'][] = [0, 15, 30, 60]

const defaultSettings = (language: Language): Settings => ({
  language,
  scheme: 'nocturne',
  mode: 'dark',
  reminderMinutes: 0,
  renewSnoozedUntil: {},
})

/** Fresh state: no hobbies, settings = language + nocturne + dark + reminder off + no snoozes. */
export function defaultState(language: Language): PersistedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    hobbies: [],
    settings: defaultSettings(language),
    settingsUpdatedAt: '',
    deletedHobbies: {},
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Keeps only string values — corrupt entries never reach the domain. */
const stringRecord = (v: unknown): Record<string, string> =>
  isRecord(v)
    ? Object.fromEntries(
        Object.entries(v).filter((e): e is [string, string] => typeof e[1] === 'string'),
      )
    : {}

// Shallow shape check; deep validation would duplicate the domain types for little gain.
const isHobbyLike = (v: unknown): boolean =>
  isRecord(v) &&
  typeof v.id === 'string' &&
  typeof v.start === 'string' &&
  Array.isArray(v.sched) &&
  Array.isArray(v.payments)

const pick = <T>(allowed: readonly T[], value: unknown, fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback

const readSettings = (raw: unknown, language: Language): Settings => {
  const d = defaultSettings(language)
  if (!isRecord(raw)) return d
  return {
    language: pick(LANGUAGES, raw.language, d.language),
    scheme: pick(SCHEMES, raw.scheme, d.scheme),
    mode: pick(MODES, raw.mode, d.mode),
    reminderMinutes: pick(REMINDERS, raw.reminderMinutes, d.reminderMinutes),
    renewSnoozedUntil: stringRecord(raw.renewSnoozedUntil),
  }
}

/**
 * Upgrades whatever was stored to the current schema.
 * - null / undefined / not an object / no numeric schemaVersion → defaultState(language)
 * - current version → same data; missing or invalid settings fields filled from defaults, missing
 *   `hobbies` → [], missing `deletedHobbies` → {}, missing `settingsUpdatedAt` → ''
 * - v1 → v2: adds `settingsUpdatedAt: ''`
 * - version newer than SCHEMA_VERSION → throws (never silently drop data written by a newer app)
 */
export function migrate(raw: unknown, language: Language): PersistedState {
  if (!isRecord(raw) || typeof raw.schemaVersion !== 'number') return defaultState(language)
  if (raw.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      `Stored data has schema v${raw.schemaVersion}; this app supports v${SCHEMA_VERSION}`,
    )
  }
  // v1 → v2: `settingsUpdatedAt` added; old settings count as never changed ('').
  return {
    schemaVersion: SCHEMA_VERSION,
    hobbies: Array.isArray(raw.hobbies)
      ? (structuredClone(raw.hobbies.filter(isHobbyLike)) as PersistedState['hobbies'])
      : [],
    settings: readSettings(raw.settings, language),
    settingsUpdatedAt: typeof raw.settingsUpdatedAt === 'string' ? raw.settingsUpdatedAt : '',
    deletedHobbies: stringRecord(raw.deletedHobbies),
  }
}

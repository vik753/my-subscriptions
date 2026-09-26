import { mergeHobbies } from '../domain'
import type { Language } from '../i18n'
import { migrate } from './persistence/migrate'
import { SCHEMA_VERSION, type PersistedState, type Settings } from './types'

/** state.json in Drive appDataFolder: the backed-up hobbies, settings and the calendar id. */
export interface BackupDoc extends PersistedState {
  calendarId: string | null
  /**
   * hobbyId → `updatedAt` when its backup was switched off. Tells other devices to stop backing
   * it up (they keep it locally) instead of uploading it again.
   */
  backupOff: Record<string, string>
}

const stringRecord = (v: unknown): Record<string, string> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
    ? Object.fromEntries(
        Object.entries(v).filter((e): e is [string, string] => typeof e[1] === 'string'),
      )
    : {}

/** The backup was written by a newer app version: sync stops until this app is updated. */
export class NewerBackupError extends Error {}

/** Reads a downloaded backup; throws for a newer schema (never overwrite what we can't read). */
export const readBackup = (raw: unknown, language: Language): BackupDoc => {
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'schemaVersion' in raw &&
    typeof raw.schemaVersion === 'number' &&
    raw.schemaVersion > SCHEMA_VERSION
  )
    throw new NewerBackupError(`backup schema v${raw.schemaVersion}`)
  const calendarId =
    typeof raw === 'object' &&
    raw !== null &&
    'calendarId' in raw &&
    typeof raw.calendarId === 'string'
      ? raw.calendarId
      : null
  const backupOff =
    typeof raw === 'object' && raw !== null && 'backupOff' in raw ? stringRecord(raw.backupOff) : {}
  return { ...migrate(raw, language), calendarId, backupOff }
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
export const mergeState = (
  local: PersistedState,
  remote: PersistedState & Partial<Pick<BackupDoc, 'backupOff'>>,
): PersistedState => {
  // Backup switched off on another device after our last change: stop backing it up here too.
  const localHobbies = local.hobbies.map((h) => {
    const off = remote.backupOff?.[h.id]
    return h.google.backup && off !== undefined && off >= h.updatedAt
      ? { ...h, google: { ...h.google, backup: false } }
      : h
  })
  const hobbies = mergeHobbies({ ...local, hobbies: localHobbies }, remote)
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

/**
 * What goes to Drive: only backed-up hobbies. Ids of hobbies that never were in the backup
 * (`known`) don't leave the phone — not even as tombstones, snoozes or opt-outs.
 */
export const backupDoc = (
  data: PersistedState,
  remote: BackupDoc | null,
  everBackedUp: readonly string[],
  calendarId: string | null,
): BackupDoc => {
  const hobbies = data.hobbies.filter((h) => h.google.backup)
  const backedUp = new Set(hobbies.map((h) => h.id))
  const known = new Set([
    ...everBackedUp,
    ...backedUp,
    ...(remote ? remote.hobbies.map((h) => h.id) : []),
    ...Object.keys(remote?.deletedHobbies ?? {}),
    ...Object.keys(remote?.backupOff ?? {}),
  ])
  const pick = (r: Record<string, string>, keep: (id: string) => boolean) =>
    Object.fromEntries(Object.entries(r).filter(([id]) => keep(id)))
  const backupOff: Record<string, string> = pick(
    remote?.backupOff ?? {},
    (id) => !backedUp.has(id) && !(id in data.deletedHobbies),
  )
  for (const h of data.hobbies)
    if (!h.google.backup && known.has(h.id)) backupOff[h.id] = backupOff[h.id] ?? h.updatedAt
  return {
    ...data,
    hobbies,
    deletedHobbies: pick(data.deletedHobbies, (id) => known.has(id)),
    settings: {
      ...data.settings,
      renewSnoozedUntil: pick(data.settings.renewSnoozedUntil, (id) => backedUp.has(id)),
    },
    calendarId,
    backupOff,
  }
}

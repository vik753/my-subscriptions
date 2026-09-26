import type { Hobby } from '../domain'
import type { Language } from '../i18n'
import type { Mode, Scheme } from '../theme/types'

export type { Mode, Scheme }

export interface Settings {
  language: Language
  scheme: Scheme
  mode: Mode
  /** Google Calendar popup reminder; 0 = off. */
  reminderMinutes: 0 | 15 | 30 | 60
  /** hobbyId → 'YYYY-MM-DD'; renewal reminder hidden until that date. */
  renewSnoozedUntil: Record<string, string>
}

export const SCHEMA_VERSION = 4

/** Everything persisted in IndexedDB and backed up to Google Drive. */
export interface PersistedState {
  schemaVersion: typeof SCHEMA_VERSION
  hobbies: Hobby[]
  settings: Settings
  /** ISO timestamp of the last settings change ('' = never): the newer copy wins on Drive merge. */
  settingsUpdatedAt: string
  /** hobbyId → ISO timestamp of deletion (tombstones for sync merge). */
  deletedHobbies: Record<string, string>
}

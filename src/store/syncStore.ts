import { create } from 'zustand'
import {
  addMinutes,
  calendarEvents,
  diffEvents,
  eventId,
  hashText,
  type CalendarEventModel,
} from '../domain'
import { APP_NAME, messages, type Language } from '../i18n'
import {
  calendarExists,
  createCalendar,
  deleteCalendar,
  deleteEvent,
  upsertEvent,
  type EventBody,
} from '../services/calendarApi'
import { deleteFile, downloadJson, findStateFile, uploadJson } from '../services/driveApi'
import { GoogleHttpError } from '../services/googleAuth'
import { useApp } from './appStore'
import { accessToken, useAuth } from './authStore'
import { mergeState, readBackup, sameState, type BackupDoc } from './backup'
import { localClock } from './clock'
import type { MetaStorage } from './persistence/storage'
import { useToast } from './toastStore'

// Google Calendar event colors.
const COLOR = { paid: '10', unpaid: '8', attended: '2' } as const
const DEBOUNCE_MS = 1500

/** Local-only bookkeeping: which calendar, and the fingerprint of every event last written. */
export interface SyncMeta {
  /** Account the calendar belongs to; another account starts from scratch. */
  account: string | null
  calendarId: string | null
  /** event key (`hobbyId|sessionKey`) → hash of the body written to Google. */
  synced: Record<string, string>
  /** ISO timestamp of the last successful sync. */
  lastSync: string | null
  /** Drive file id of the state.json backup, once known. */
  driveFileId: string | null
}

const emptyMeta = (account: string | null): SyncMeta => ({
  account,
  calendarId: null,
  synced: {},
  lastSync: null,
  driveFileId: null,
})

const readMeta = (raw: unknown): SyncMeta => {
  const m = (raw ?? {}) as Partial<SyncMeta>
  return {
    account: typeof m.account === 'string' ? m.account : null,
    calendarId: typeof m.calendarId === 'string' ? m.calendarId : null,
    synced: m.synced && typeof m.synced === 'object' ? { ...m.synced } : {},
    lastSync: typeof m.lastSync === 'string' ? m.lastSync : null,
    driveFileId: typeof m.driveFileId === 'string' ? m.driveFileId : null,
  }
}

/** The Google event for one session: localized title/description, color, popup reminder. */
export const eventBody = (
  e: CalendarEventModel,
  lang: Language,
  reminderMinutes: number,
  appUrl: string,
  timeZone: string,
): EventBody => {
  const t = messages[lang]
  const label = { paid: t.paid, unpaid: t.unpaid, attended: t.attended }[e.status]
  return {
    summary: `${e.name} · ${label}`,
    description: [label, t.evDur(e.dur), ...(e.lastPaid ? [t.lastPaidNote] : []), appUrl].join(
      '\n',
    ),
    colorId: COLOR[e.status],
    start: { dateTime: `${e.date}T${e.time}:00`, timeZone },
    end: { dateTime: `${addMinutes(e.date, e.time, e.dur)}:00`, timeZone },
    reminders: {
      useDefault: false,
      overrides: reminderMinutes > 0 ? [{ method: 'popup', minutes: reminderMinutes }] : [],
    },
    extendedProperties: { private: { hobbyId: e.hobbyId, sessionKey: e.sessionKey } },
  }
}

interface SyncState {
  running: boolean
  online: boolean
  lastSync: string | null
  /** Sync over all hobbies; resolves when done (or skipped: offline, no session, already running). */
  run: () => Promise<boolean>
  /** Debounced run after local changes. */
  schedule: () => void
}

let meta: MetaStorage | null = null
let rerun = false
let timer: number | undefined
// The calendar's existence is checked once per launch, not on every sync.
let verified = false

/** Seam for tests. */
export const syncEnv = {
  appUrl: () => `${window.location.origin}${import.meta.env.BASE_URL}`,
  timeZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
}

const sync = async (store: MetaStorage): Promise<void> => {
  const token = accessToken()
  const account = useAuth.getState().user?.email ?? null
  if (!token) throw new GoogleHttpError(401, 'token')

  let m = readMeta(await store.load())
  if (m.account !== account) m = emptyMeta(account)
  const save = () => store.save(m)

  // 1. Backup: merge this device with the Drive copy (another device may have changed things).
  const language = useApp.getState().data.settings.language
  let fileId = m.driveFileId ?? (await findStateFile(token))
  let remote: BackupDoc | null = null
  if (fileId) {
    try {
      remote = readBackup(await downloadJson(token, fileId), language)
    } catch (e) {
      // The file vanished (e.g. "Delete all data" on another device): write a new one.
      if (!(e instanceof GoogleHttpError && e.status === 404)) throw e
      fileId = null
    }
  }
  if (remote) {
    const local = useApp.getState().data
    const merged = mergeState(local, remote)
    if (!sameState(merged, local)) useApp.getState().applyMerged(merged)
    // A new device reuses the calendar the account already has.
    if (!m.calendarId && remote.calendarId) {
      m.calendarId = remote.calendarId
      verified = false
    }
  }

  // 2. Calendar — created only once there is something to put in it.
  const { hobbies, settings } = useApp.getState().data
  const now = localClock.now()
  const bodies = new Map<string, { model: CalendarEventModel; body: EventBody; hash: string }>()
  for (const model of calendarEvents(hobbies, now)) {
    const body = eventBody(
      model,
      settings.language,
      settings.reminderMinutes,
      syncEnv.appUrl(),
      syncEnv.timeZone(),
    )
    bodies.set(model.key, { model, body, hash: hashText(JSON.stringify(body)) })
  }
  if (m.calendarId || bodies.size > 0) {
    if (m.calendarId && !verified && !(await calendarExists(token, m.calendarId)))
      m = { ...emptyMeta(account), lastSync: m.lastSync, driveFileId: fileId }
    if (!m.calendarId) {
      m.calendarId = await createCalendar(token, APP_NAME, syncEnv.timeZone())
      m.synced = {}
      await save()
    }
    verified = true
    const calendarId = m.calendarId

    const { upsert, remove } = diffEvents(
      [...bodies.values()].map(({ model, hash }) => ({ key: model.key, hash })),
      m.synced,
    )

    // Bookkeeping is saved after every write: a crash never loses more than one op, and
    // deterministic ids make redoing that op harmless.
    for (const key of upsert) {
      const item = bodies.get(key)
      if (!item) continue
      await upsertEvent(
        token,
        calendarId,
        eventId(item.model.hobbyId, item.model.sessionKey),
        item.body,
      )
      m.synced[key] = item.hash
      await save()
    }
    for (const key of remove) {
      const [hobbyId = '', sessionKey = ''] = key.split('|')
      await deleteEvent(token, calendarId, eventId(hobbyId, sessionKey))
      m.synced = Object.fromEntries(Object.entries(m.synced).filter(([k]) => k !== key))
      await save()
    }
  }

  // 3. Backup: write the merged state back when it differs from the Drive copy.
  const doc: BackupDoc = { ...useApp.getState().data, calendarId: m.calendarId }
  if (!remote || !sameState(doc, remote)) fileId = await uploadJson(token, fileId, doc)
  m.driveFileId = fileId

  m.lastSync = new Date().toISOString()
  await save()
  useSync.setState({ lastSync: m.lastSync })
}

export const useSync = create<SyncState>((set, get) => ({
  running: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  lastSync: null,

  run: async () => {
    const store = meta
    if (!store || useAuth.getState().status !== 'signedIn' || !get().online) return false
    if (get().running) {
      rerun = true
      return false
    }
    set({ running: true })
    let ok = false
    try {
      do {
        rerun = false
        await sync(store)
      } while (rerun)
      ok = true
    } catch (e) {
      if (e instanceof GoogleHttpError && e.status === 401) useAuth.getState().expire()
      // The calendar vanished mid-sync: check again (and recreate it) on a fresh run.
      else if (e instanceof GoogleHttpError && e.status === 404) {
        verified = false
        get().schedule()
      }
      // Network errors: nothing to do — the diff is recomputed on the next run.
    } finally {
      set({ running: false })
    }
    return ok
  },

  schedule: () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => void get().run(), DEBOUNCE_MS)
  },
}))

/**
 * Starts syncing: loads the bookkeeping, runs now, after local changes, when back online,
 * on sign-in and when the app returns to the foreground (extends the 12-week window).
 */
export const startSync = (store: MetaStorage): (() => void) => {
  meta = store
  verified = false
  void store.load().then((raw) => useSync.setState({ lastSync: readMeta(raw).lastSync }))
  const { run, schedule } = useSync.getState()
  void run()

  const unApp = useApp.subscribe((s, prev) => {
    const a = s.data
    const b = prev.data
    if (
      a.hobbies !== b.hobbies ||
      a.settings.language !== b.settings.language ||
      a.settings.reminderMinutes !== b.settings.reminderMinutes
    )
      schedule()
  })
  const unAuth = useAuth.subscribe((s, prev) => {
    if (s.status === 'signedIn' && prev.status !== 'signedIn') void run()
  })
  const onOnline = () => {
    useSync.setState({ online: true })
    void run()
  }
  const onOffline = () => {
    useSync.setState({ online: false })
    useToast.getState().show(messages[useApp.getState().data.settings.language].tOffline)
  }
  const onVisible = () => {
    if (document.visibilityState === 'visible') void run()
  }
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  document.addEventListener('visibilitychange', onVisible)
  return () => {
    unApp()
    unAuth()
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
    document.removeEventListener('visibilitychange', onVisible)
    window.clearTimeout(timer)
    meta = null
  }
}

/**
 * "Delete all data": the calendar and the Drive backup go first (when Google is reachable), then
 * the local data. Offline, the local tombstones remove the hobbies everywhere on the next sync.
 */
export const wipeAllData = async (): Promise<void> => {
  const token = accessToken()
  const m = readMeta(await meta?.load())
  let removed = false
  if (token && useSync.getState().online) {
    try {
      if (m.calendarId) await deleteCalendar(token, m.calendarId)
      const fileId = m.driveFileId ?? (await findStateFile(token))
      if (fileId) await deleteFile(token, fileId)
      removed = true
    } catch {
      // Unreachable now: tombstones and the event diff finish the job on the next sync.
    }
  }
  if (removed) {
    verified = false
    await meta?.save(emptyMeta(m.account))
    useSync.setState({ lastSync: null })
  }
  useApp.getState().wipe()
}

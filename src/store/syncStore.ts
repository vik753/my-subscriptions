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
  renameCalendar,
  deleteCalendar,
  deleteEvent,
  listHobbyEventIds,
  upsertEvent,
  type EventBody,
} from '../services/calendarApi'
import { deleteFile, downloadJson, findStateFile, uploadJson } from '../services/driveApi'
import { GoogleHttpError } from '../services/googleAuth'
import { useApp } from './appStore'
import { accessToken, useAuth } from './authStore'
import {
  backupDoc,
  mergeState,
  NewerBackupError,
  readBackup,
  sameState,
  type BackupDoc,
} from './backup'
import { defaultState } from './persistence/migrate'
import { localClock } from './clock'
import type { MetaStorage } from './persistence/storage'
import { useToast } from './toastStore'

// Google Calendar event colors.
// A forfeit session is inactive: Graphite like unpaid, told apart by its crossed-out title.
const COLOR = { paid: '10', unpaid: '8', attended: '2', forfeit: '8' } as const

/** Crossed-out text for event titles (Google Calendar titles have no formatting). */
const strike = (text: string) => Array.from(text, (c) => `${c}\u0336`).join('')
const DEBOUNCE_MS = 1500

/** Local-only bookkeeping: which calendar, and the fingerprint of every event last written. */
export interface SyncMeta {
  /** Account the calendar belongs to; another account starts from scratch. */
  account: string | null
  calendarId: string | null
  /** The calendar name last written (renamed when the account's name changes). */
  calendarName: string | null
  /** event key (`hobbyId|sessionKey`) → hash of the body written to Google. */
  synced: Record<string, string>
  /** ISO timestamp of the last successful sync. */
  lastSync: string | null
  /** Drive file id of the state.json backup, once known. */
  driveFileId: string | null
  /** hobbyId → tombstone time whose events were already purged from this calendar. */
  purged: Record<string, string>
  /** Hobbies ever written to this account's backup (their ids may appear in it). */
  backedUp: string[]
}

const emptyMeta = (account: string | null): SyncMeta => ({
  account,
  calendarId: null,
  calendarName: null,
  synced: {},
  lastSync: null,
  driveFileId: null,
  purged: {},
  backedUp: [],
})

const readMeta = (raw: unknown): SyncMeta => {
  const m = (raw ?? {}) as Partial<SyncMeta>
  return {
    account: typeof m.account === 'string' ? m.account : null,
    calendarId: typeof m.calendarId === 'string' ? m.calendarId : null,
    calendarName: typeof m.calendarName === 'string' ? m.calendarName : null,
    synced: m.synced && typeof m.synced === 'object' ? { ...m.synced } : {},
    lastSync: typeof m.lastSync === 'string' ? m.lastSync : null,
    driveFileId: typeof m.driveFileId === 'string' ? m.driveFileId : null,
    purged: m.purged && typeof m.purged === 'object' ? { ...m.purged } : {},
    backedUp: Array.isArray(m.backedUp)
      ? m.backedUp.filter((id): id is string => typeof id === 'string')
      : [],
  }
}

/** Who owns the calendar: shown to guests, since Google names the calendar as the organizer. */
export interface CalendarOwner {
  name: string
  email: string
}

const ownerLabel = (o: CalendarOwner) => (o.name === o.email ? o.email : `${o.name} (${o.email})`)

/**
 * "My Subscriptions · Ihor Korenets": events of a secondary calendar show the calendar as their
 * organizer, so the name tells guests whose sessions these are.
 */
export const calendarName = (owner: CalendarOwner | null): string =>
  owner ? `${APP_NAME} · ${owner.name}` : APP_NAME

/** The Google event for one session: localized title/description, color, popup reminder. */
export const eventBody = (
  e: CalendarEventModel,
  lang: Language,
  reminderMinutes: number,
  appUrl: string,
  timeZone: string,
  /** The hobby's calendar options: color of paid sessions, guests. */
  options: { paidColor: string; guests: readonly string[] } = { paidColor: COLOR.paid, guests: [] },
  owner: CalendarOwner | null = null,
): EventBody => {
  const t = messages[lang]
  const label = {
    paid: t.paid,
    unpaid: t.unpaid,
    attended: t.attended,
    forfeit: t.histForfeit,
  }[e.status]
  return {
    summary: `${e.status === 'forfeit' ? strike(e.name) : e.name} · ${label}`,
    description: [
      label,
      t.evDur(e.dur),
      ...(e.lastPaid ? [t.lastPaidNote] : []),
      // Only guests need to be told who added the session.
      ...(owner && options.guests.length > 0 ? [t.evOrganizer(ownerLabel(owner))] : []),
      appUrl,
    ].join('\n'),
    colorId: e.status === 'paid' ? options.paidColor : COLOR[e.status],
    start: { dateTime: `${e.date}T${e.time}:00`, timeZone },
    end: { dateTime: `${addMinutes(e.date, e.time, e.dur)}:00`, timeZone },
    reminders: {
      useDefault: false,
      overrides: reminderMinutes > 0 ? [{ method: 'popup', minutes: reminderMinutes }] : [],
    },
    // Guests see the sessions in their own calendar; they can't change or re-invite.
    attendees: options.guests.map((email) => ({ email })),
    guestsCanModify: false,
    guestsCanInviteOthers: false,
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
  schedule: (delay?: number) => void
}

/** No valid token locally — not a Google rejection; renewal is up to the auth store. */
class TokenMissing extends Error {}

const PARALLEL = 4
const RETRY_MS = [5_000, 15_000, 60_000, 300_000]

/** Runs `fn` over `items`, at most PARALLEL at a time; rejects on the first failure. */
const inParallel = async <T>(items: readonly T[], fn: (item: T) => Promise<void>) => {
  const queue = [...items]
  const worker = async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await fn(item)
  }
  await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, worker))
}

let meta: MetaStorage | null = null
// Hobbies deleted on this device while the app is open: confirm once the calendar is clean.
// (Old tombstones cleaned up at launch stay silent.)
let announce = new Set<string>()

/** "Delete hobby" on this device: show "Deleted successfully" once its events are gone. */
export const announceDeletion = (hobbyId: string) => {
  announce.add(hobbyId)
}
// Failed runs retry by themselves (5 s, 15 s, 1 min, then every 5 min) until one succeeds.
let failures = 0
let retryTimer: number | undefined
// One immediate retry after a 404 (vanished calendar); a lasting 404 waits for the next trigger.
let retried404 = false
// The "backup is from a newer app" toast is shown once per launch.
let warnedNewer = false
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
  if (!token) throw new TokenMissing()

  let m = readMeta(await store.load())
  if (m.account !== account) {
    // Another Google account signed in on this device. Backed-up hobbies belong to the previous
    // account (they stay safe in its Drive) and leave this device; local hobbies stay, but their
    // calendar option is switched off so they don't land in the new account's calendar.
    // Device preferences (theme, language) stay.
    if (m.account !== null) {
      const data = useApp.getState().data
      useApp.getState().applyMerged({
        ...defaultState(data.settings.language),
        settings: data.settings,
        settingsUpdatedAt: data.settingsUpdatedAt,
        hobbies: data.hobbies
          .filter((h) => !h.google.backup)
          .map((h) => (h.google.calendar ? { ...h, google: { ...h.google, calendar: false } } : h)),
      })
    }
    m = emptyMeta(account)
  }
  const save = () => store.save(m)

  // 1. Backup: merge this device with the Drive copy (another device may have changed things).
  const language = useApp.getState().data.settings.language
  const download = async (id: string | null): Promise<BackupDoc | null> => {
    if (!id) return null
    try {
      return readBackup(await downloadJson(token, id), language)
    } catch (e) {
      if (e instanceof GoogleHttpError && e.status === 404) return null
      throw e
    }
  }
  // This account already has (or had) a backup: keep writing it, if only to spread deletions.
  const hadBackup = m.driveFileId !== null
  let fileId = m.driveFileId ?? (await findStateFile(token))
  let remote = await download(fileId)
  if (!remote && m.driveFileId) {
    // The remembered file is gone (e.g. "Delete all data" on another device, which then wrote a
    // new one): look for the current file instead of forking a second copy.
    fileId = await findStateFile(token)
    remote = await download(fileId)
  }
  if (!remote) fileId = null
  if (remote) {
    // Everything in the backup counts as backed up here too (e.g. to spread a later deletion).
    m.backedUp = [
      ...new Set([
        ...m.backedUp,
        ...remote.hobbies.map((h) => h.id),
        ...Object.keys(remote.deletedHobbies),
      ]),
    ]
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
  // Only hobbies that opted in get events.
  const withCalendar = hobbies.filter((h) => h.google.calendar)
  const byId = new Map(withCalendar.map((h) => [h.id, h.google]))
  const user = useAuth.getState().user
  const owner = user ? { name: user.name, email: user.email } : null
  for (const model of calendarEvents(withCalendar, now)) {
    const body = eventBody(
      model,
      settings.language,
      settings.reminderMinutes,
      syncEnv.appUrl(),
      syncEnv.timeZone(),
      byId.get(model.hobbyId),
      owner,
    )
    bodies.set(model.key, { model, body, hash: hashText(JSON.stringify(body)) })
  }
  if (m.calendarId || bodies.size > 0) {
    if (m.calendarId && !verified && !(await calendarExists(token, m.calendarId)))
      m = { ...emptyMeta(account), lastSync: m.lastSync, driveFileId: fileId }
    const name = calendarName(owner)
    if (!m.calendarId) {
      m.calendarId = await createCalendar(token, name, syncEnv.timeZone())
      m.calendarName = name
      m.synced = {}
      await save()
    }
    verified = true
    const calendarId = m.calendarId
    // Calendars from before the owner's name was added (or after the account name changed).
    if (owner && m.calendarName !== name) {
      try {
        await renameCalendar(token, calendarId, name)
        m.calendarName = name
        await save()
      } catch (e) {
        // Only a nicety: the sessions still sync, the rename is retried next time.
        if (!(e instanceof GoogleHttpError) || e.status === 401) throw e
      }
    }

    const { upsert, remove } = diffEvents(
      [...bodies.values()].map(({ model, hash }) => ({ key: model.key, hash })),
      m.synced,
    )

    // Deletions first and in parallel: deleting a hobby should empty the calendar within
    // seconds, before the user can switch apps (a backgrounded PWA is frozen mid-sync).
    // A deleted hobby loses every event, not only the ones this device remembers writing
    // (another device may have written later sessions, or the bookkeeping may be gone).
    // Same for a hobby whose calendar option was switched off (marker 'off').
    const { deletedHobbies: tombstones, hobbies: current } = useApp.getState().data
    for (const h of current)
      if (h.google.calendar && h.id in m.purged)
        m.purged = Object.fromEntries(Object.entries(m.purged).filter(([id]) => id !== h.id))
    const purges: [string, string][] = [
      ...Object.entries(tombstones),
      ...current.filter((h) => !h.google.calendar).map((h): [string, string] => [h.id, 'off']),
    ]
    for (const [hobbyId, deletedAt] of purges) {
      if (m.purged[hobbyId] === deletedAt) continue
      const ids = await listHobbyEventIds(token, calendarId, hobbyId)
      await inParallel(ids, (id) => deleteEvent(token, calendarId, id))
      m.synced = Object.fromEntries(
        Object.entries(m.synced).filter(([k]) => !k.startsWith(`${hobbyId}|`)),
      )
      m.purged[hobbyId] = deletedAt
      await save()
    }
    await inParallel(
      remove.filter((key) => key in m.synced),
      async (key) => {
        const [hobbyId = '', sessionKey = ''] = key.split('|')
        await deleteEvent(token, calendarId, eventId(hobbyId, sessionKey))
        m.synced = Object.fromEntries(Object.entries(m.synced).filter(([k]) => k !== key))
        await save()
      },
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
  }

  // 3. Backup: write the merged state back when it differs from the Drive copy.
  // Only hobbies that opted in are backed up; no file is created until one does.
  const doc = backupDoc(useApp.getState().data, remote, m.backedUp, m.calendarId)
  if ((remote || hadBackup || doc.hobbies.length > 0) && !(remote && sameState(doc, remote))) {
    fileId = await uploadJson(token, fileId, doc)
    m.backedUp = [...new Set([...m.backedUp, ...doc.hobbies.map((h) => h.id)])]
  }
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
    // Local data failed to load: syncing now would erase the calendar and backup with empty data.
    if (
      !store ||
      useApp.getState().loadError ||
      useAuth.getState().status !== 'signedIn' ||
      !get().online
    )
      return false
    if (!accessToken()) {
      // Expired locally: renew (silently if possible) instead of declaring "Sign in again".
      useAuth.getState().resume()
      return false
    }
    if (get().running) {
      rerun = true
      return false
    }
    set({ running: true })
    let ok = false
    try {
      let confirming = new Set<string>()
      do {
        rerun = false
        confirming = new Set(announce)
        await sync(store)
      } while (rerun)
      ok = true
      retried404 = false
      // The last pass started after these deletions and removed all their events.
      if (confirming.size > 0) {
        useToast.getState().show(messages[useApp.getState().data.settings.language].tDeleteDone)
        for (const id of confirming) announce.delete(id)
      }
      failures = 0
      window.clearTimeout(retryTimer)
    } catch (e) {
      rerun = false
      if (e instanceof GoogleHttpError && e.status === 401) useAuth.getState().expire()
      // The calendar vanished mid-sync: check again (and recreate it) on a fresh run.
      else if (e instanceof GoogleHttpError && e.status === 404) {
        verified = false
        if (!retried404) {
          retried404 = true
          get().schedule()
        }
      } else if (e instanceof NewerBackupError) {
        if (!warnedNewer) {
          warnedNewer = true
          useToast.getState().show(messages[useApp.getState().data.settings.language].syncNewer)
        }
      }
      // Network failures, timeouts, rate limits: the work is still pending in the diff, so try
      // again by itself — the user must never have to press "Sync now".
      else if (!(e instanceof TokenMissing)) {
        const delay = RETRY_MS[Math.min(failures, RETRY_MS.length - 1)] ?? 300_000
        failures++
        window.clearTimeout(retryTimer)
        retryTimer = window.setTimeout(() => void get().run(), delay)
      }
    } finally {
      set({ running: false })
    }
    return ok
  },

  schedule: (delay = DEBOUNCE_MS) => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => void get().run(), delay)
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
    // A deleted hobby syncs at once: its events should vanish while the user still looks.
    if (a.deletedHobbies !== b.deletedHobbies) schedule(0)
    else if (
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
    window.clearTimeout(retryTimer)
    failures = 0
    announce = new Set()
    meta = null
  }
}

/** Deletes the calendar (shared events one by one first) and the Drive backup. */
const deleteGoogleData = async (token: string, m: SyncMeta): Promise<void> => {
  if (m.calendarId) {
    // Guests hold copies of these events. Deleting each event is documented to cancel it
    // for every attendee; deleting the whole calendar is not, so shared events go first.
    const calendarId = m.calendarId
    const shared = useApp
      .getState()
      .data.hobbies.filter((h) => h.google.calendar && h.google.guests.length > 0)
    for (const h of shared) {
      const ids = await listHobbyEventIds(token, calendarId, h.id)
      await inParallel(ids, (id) => deleteEvent(token, calendarId, id))
    }
    await deleteCalendar(token, calendarId)
  }
  const fileId = m.driveFileId ?? (await findStateFile(token))
  if (fileId) await deleteFile(token, fileId)
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
      await deleteGoogleData(token, m)
      removed = true
    } catch {
      // Unreachable now: tombstones and the event diff finish the job on the next sync.
    }
  }
  if (removed) {
    verified = false
    // The deleted file's id stays: the next sync writes a fresh backup with the tombstones, so
    // other devices drop their copies instead of restoring them.
    await meta?.save({ ...emptyMeta(m.account), driveFileId: m.driveFileId, backedUp: m.backedUp })
    useSync.setState({ lastSync: null })
  }
  useApp.getState().wipe()
}

/**
 * "Delete only from Google": the calendar and the Drive backup go, the hobbies stay on this phone
 * with their Google options switched off (else the next sync would recreate everything).
 * Needs a connection and a valid sign-in; returns false (and changes nothing) without them.
 */
export const wipeGoogleData = async (): Promise<boolean> => {
  const token = accessToken()
  if (!token || !useSync.getState().online) return false
  const m = readMeta(await meta?.load())
  try {
    await deleteGoogleData(token, m)
  } catch {
    return false
  }
  verified = false
  await meta?.save(emptyMeta(m.account))
  useSync.setState({ lastSync: null })
  useApp.getState().disableGoogle()
  return true
}

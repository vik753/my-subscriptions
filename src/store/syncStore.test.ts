import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cancelSession, eventId, markSession } from '../domain'
import { googleHttp } from '../services/googleHttp'
import { resetAppStore, useApp } from './appStore'
import { useAuth } from './authStore'
import { localClock } from './clock'
import { createMemoryMeta, createMemoryStorage } from './persistence/storage'
import { eventBody, startSync, syncEnv, useSync } from './syncStore'

/** In-memory Google Calendar: enough of calendars + events to exercise the sync. */
const server = () => {
  const calendars = new Map<string, Map<string, Record<string, unknown>>>()
  let next = 1
  const requests: string[] = []
  let failWith: number | null = null
  const drive = new Map<string, unknown>()
  const handleDrive = (u: URL, method: string, init?: RequestInit): Response => {
    const ok = (data: unknown = {}) => new Response(JSON.stringify(data), { status: 200 })
    const id = decodeURIComponent(u.pathname.split('/files/')[1] ?? '')
    if (method === 'GET' && !id) return ok({ files: [...drive.keys()].map((k) => ({ id: k })) })
    if (method === 'GET')
      return drive.has(id) ? ok(drive.get(id)) : new Response('{}', { status: 404 })
    if (method === 'POST') {
      const newId = `file${drive.size + 1}`
      drive.set(newId, null)
      return ok({ id: newId })
    }
    if (method === 'PATCH') {
      drive.set(id, JSON.parse(String(init?.body)))
      return ok({ id })
    }
    drive.delete(id)
    return new Response(null, { status: 204 })
  }
  const handle = (url: string, init?: RequestInit): Response => {
    const method = init?.method ?? 'GET'
    const u = new URL(url)
    if (u.pathname.includes('/drive/v3/')) {
      requests.push(`DRIVE ${method}`)
      return failWith ? new Response('{}', { status: failWith }) : handleDrive(u, method, init)
    }
    requests.push(`${method} ${decodeURIComponent(u.pathname.replace('/calendar/v3', ''))}`)
    if (failWith) return new Response('{}', { status: failWith })
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {}
    const parts = u.pathname
      .replace('/calendar/v3/calendars', '')
      .split('/')
      .filter(Boolean)
      .map(decodeURIComponent)
    const ok = (data: unknown = {}) => new Response(JSON.stringify(data), { status: 200 })
    if (parts.length === 0 && method === 'POST') {
      const id = `cal${next++}`
      calendars.set(id, new Map())
      return ok({ id })
    }
    const events = calendars.get(parts[0] ?? '')
    if (!events) return new Response('{}', { status: 404 })
    if (parts.length === 1) return ok({ id: parts[0] })
    if (parts.length === 2 && method === 'POST') {
      const id = String(body.id)
      if (events.has(id)) return new Response('{}', { status: 409 })
      events.set(id, { ...body, status: 'confirmed' })
      return ok(body)
    }
    const id = parts[2] ?? ''
    const event = events.get(id)
    if (method === 'PATCH') {
      if (!event) return new Response('{}', { status: 404 })
      events.set(id, { ...event, ...body })
      return ok()
    }
    if (method === 'DELETE') {
      if (!event || event.status === 'cancelled') return new Response('{}', { status: 410 })
      events.set(id, { ...event, status: 'cancelled' })
      return new Response(null, { status: 204 })
    }
    return new Response('{}', { status: 400 })
  }
  return {
    calendars,
    drive,
    requests,
    fail: (status: number | null) => (failWith = status),
    live: (cal: string) =>
      [...(calendars.get(cal)?.values() ?? [])].filter((e) => e.status === 'confirmed'),
    handle,
  }
}

const initial = useApp.getState()
const authInitial = useAuth.getState()
let google: ReturnType<typeof server>
let meta: ReturnType<typeof createMemoryMeta>
let stop: () => void = () => {}

const signIn = (email = 'me@gmail.com') => {
  sessionStorage.setItem(
    'auth.token',
    JSON.stringify({ accessToken: 'tok', expiresAt: Date.now() + 3_600_000 }),
  )
  useAuth.setState({ status: 'signedIn', user: { email, name: 'Me' }, known: true })
}

const addGym = (sessions = 2) =>
  useApp.getState().addHobby({
    id: 'gym',
    name: 'Gym',
    start: '2026-09-21',
    times: { 0: '10:00' },
    durs: { 0: 60 },
    currency: 'UAH',
    sessions,
    price: 200_000,
    paymentDate: '2026-09-20',
  })

beforeEach(async () => {
  stop = () => {}
  resetAppStore(initial)
  useAuth.setState(authInitial, true)
  useSync.setState({ running: false, online: true, lastSync: null })
  sessionStorage.clear()
  vi.spyOn(localClock, 'now').mockReturnValue('2026-09-24T10:02')
  vi.spyOn(syncEnv, 'appUrl').mockReturnValue('https://example.test/app/')
  vi.spyOn(syncEnv, 'timeZone').mockReturnValue('Europe/Kyiv')
  google = server()
  vi.spyOn(googleHttp, 'fetch').mockImplementation((url, init) =>
    Promise.resolve(google.handle(url, init)),
  )
  vi.spyOn(googleHttp, 'sleep').mockResolvedValue()
  await useApp.getState().load(createMemoryStorage(), 'en')
  meta = createMemoryMeta()
})

afterEach(() => {
  stop()
  vi.restoreAllMocks()
})

const settle = () => vi.waitFor(() => expect(useSync.getState().running).toBe(false))
/** One full sync (joins a run already in flight). */
const run = async () => {
  await settle()
  const ok = await useSync.getState().run()
  await settle()
  return ok
}

describe('eventBody', () => {
  it('builds the localized event with color, duration, renew note and reminder', () => {
    const body = eventBody(
      {
        key: 'gym|2026-09-28',
        hobbyId: 'gym',
        sessionKey: '2026-09-28',
        name: 'Спортзал',
        date: '2026-09-28',
        time: '23:30',
        dur: 60,
        status: 'paid',
        lastPaid: true,
      },
      'ru',
      30,
      'https://example.test/app/',
      'Europe/Kyiv',
    )
    expect(body).toEqual({
      summary: 'Спортзал · Оплачено',
      description:
        'Оплачено\nДлительность: 60 мин\nПоследнее оплаченное занятие — пора продлить абонемент\nhttps://example.test/app/',
      colorId: '10',
      start: { dateTime: '2026-09-28T23:30:00', timeZone: 'Europe/Kyiv' },
      end: { dateTime: '2026-09-29T00:30:00', timeZone: 'Europe/Kyiv' },
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }] },
      extendedProperties: { private: { hobbyId: 'gym', sessionKey: '2026-09-28' } },
    })
  })

  it('uses Graphite for unpaid, Sage for attended, no reminder when off', () => {
    const base = {
      key: 'k',
      hobbyId: 'h',
      sessionKey: '2026-09-28',
      name: 'Gym',
      date: '2026-09-28',
      time: '10:00',
      dur: 60,
      lastPaid: false,
    }
    const unpaid = eventBody({ ...base, status: 'unpaid' }, 'en', 0, 'u', 'UTC')
    expect(unpaid).toMatchObject({
      summary: 'Gym · Unpaid',
      colorId: '8',
      reminders: { overrides: [] },
    })
    expect(eventBody({ ...base, status: 'attended' }, 'en', 0, 'u', 'UTC').colorId).toBe('2')
  })
})

describe('calendar sync', () => {
  it('waits while signed out', async () => {
    addGym()
    stop = startSync(meta)
    expect(await run()).toBe(false)
    expect(google.requests).toEqual([])
  })

  it('creates the calendar once and one event per session', async () => {
    addGym()
    signIn()
    stop = startSync(meta)
    expect(await run()).toBe(true)
    // Sep 21 … 12 weeks ahead (until Dec 17): 13 Mondays.
    expect(google.live('cal1')).toHaveLength(13)
    expect(google.requests.filter((r) => r === 'POST /calendars')).toHaveLength(1)
    expect(useSync.getState().lastSync).not.toBeNull()

    // Nothing changed → no event writes.
    google.requests.length = 0
    await run()
    expect(google.requests.filter((r) => !r.startsWith('GET') && !r.startsWith('DRIVE'))).toEqual(
      [],
    )
  })

  it('writes only what changed', async () => {
    addGym()
    signIn()
    stop = startSync(meta)
    await run()
    google.requests.length = 0

    // Attending the first session changes that event; cancelling a paid one deletes it and
    // moves the payment (the next unpaid session becomes paid).
    useApp.getState().updateHobby('gym', (h) => markSession(h, '2026-09-21', 'attended'))
    useApp
      .getState()
      .updateHobby('gym', (h) => cancelSession(h, '2026-09-28', true, '2026-09-24T10:02'))
    await run()
    const writes = google.requests.filter((r) => !r.startsWith('GET') && !r.startsWith('DRIVE'))
    expect(writes.sort()).toEqual(
      [
        `DELETE /calendars/cal1/events/${eventId('gym', '2026-09-28')}`,
        'POST /calendars/cal1/events', // Sep 21 → attended (409 → patch)
        `PATCH /calendars/cal1/events/${eventId('gym', '2026-09-21')}`,
        'POST /calendars/cal1/events', // Oct 5 → paid + last paid
        `PATCH /calendars/cal1/events/${eventId('gym', '2026-10-05')}`,
      ].sort(),
    )
    const events = google.calendars.get('cal1')
    expect(events?.get(eventId('gym', '2026-09-21'))).toMatchObject({
      colorId: '2',
      summary: 'Gym · Attended',
    })
    expect(events?.get(eventId('gym', '2026-10-05'))).toMatchObject({
      colorId: '10',
      summary: 'Gym · Paid',
    })
  })

  it('removes the events of a deleted hobby', async () => {
    addGym()
    signIn()
    stop = startSync(meta)
    await run()
    useApp.getState().deleteHobby('gym')
    await run()
    expect(google.live('cal1')).toEqual([])
  })

  it('recreates the calendar when the user deleted it', async () => {
    addGym()
    signIn()
    stop = startSync(meta)
    await run()
    google.calendars.delete('cal1')
    stop()
    stop = startSync(meta) // next launch verifies the calendar
    await run()
    expect(google.live('cal2')).toHaveLength(13)
  })

  it('starts over for another Google account', async () => {
    addGym()
    signIn('me@gmail.com')
    stop = startSync(meta)
    await run()
    signIn('other@gmail.com')
    google.drive.clear() // each account has its own Drive
    await run()
    expect(google.live('cal2')).toHaveLength(13)
    expect(meta.value).toMatchObject({ account: 'other@gmail.com', calendarId: 'cal2' })
  })

  it('asks to sign in again when Google rejects the token, keeping the work for later', async () => {
    addGym()
    signIn()
    stop = startSync(meta)
    google.fail(401)
    expect(await run()).toBe(false)
    expect(useAuth.getState()).toMatchObject({ status: 'signedOut', known: true })
    google.fail(null)
    signIn()
    await run()
    expect(google.live('cal1')).toHaveLength(13)
  })

  it('does nothing offline and syncs when back online', async () => {
    addGym()
    signIn()
    useSync.setState({ online: false })
    stop = startSync(meta)
    expect(await run()).toBe(false)
    expect(google.requests).toEqual([])
    window.dispatchEvent(new Event('online'))
    await vi.waitFor(() => expect(google.live('cal1')).toHaveLength(13))
  })

  it('resumes after a network failure without duplicates', async () => {
    addGym()
    signIn()
    let n = 0
    vi.mocked(googleHttp.fetch).mockImplementation((url, init) => {
      if (++n === 6) return Promise.reject(new TypeError('Failed to fetch'))
      return Promise.resolve(google.handle(url, init))
    })
    stop = startSync(meta)
    await settle()
    expect(google.live('cal1').length).toBeLessThan(13)
    expect(await run()).toBe(true)
    expect(google.calendars.get('cal1')?.size).toBe(13)
  })

  it('re-syncs after local changes (debounced)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      addGym()
      signIn()
      stop = startSync(meta)
      await vi.waitFor(() => expect(useSync.getState().running).toBe(false))
      await useSync.getState().run()
      google.requests.length = 0
      useApp.getState().updateHobby('gym', (h) => ({ ...h, name: 'Swim' }))
      await vi.advanceTimersByTimeAsync(1600)
      await vi.waitFor(() =>
        expect(google.live('cal1')[0]).toMatchObject({ summary: 'Swim · Paid' }),
      )
    } finally {
      vi.useRealTimers()
    }
  })

  describe('Drive backup', () => {
    const backup = () => [...google.drive.values()][0] as Record<string, unknown> | undefined

    it('backs up the state with the calendar id, and only when it changed', async () => {
      addGym()
      signIn()
      stop = startSync(meta)
      await run()
      expect(backup()).toMatchObject({
        schemaVersion: 2,
        calendarId: 'cal1',
        hobbies: [{ id: 'gym' }],
      })
      google.requests.length = 0
      await run()
      expect(google.requests.filter((r) => r === 'DRIVE PATCH')).toEqual([])
    })

    it('a new device restores hobbies and reuses the account calendar', async () => {
      addGym()
      signIn()
      stop = startSync(meta)
      await run()
      stop()

      // Second device: empty local data, fresh bookkeeping, same account.
      resetAppStore(initial)
      await useApp.getState().load(createMemoryStorage(), 'en')
      meta = createMemoryMeta()
      stop = startSync(meta)
      await run()
      expect(useApp.getState().data.hobbies.map((h) => h.name)).toEqual(['Gym'])
      expect(google.calendars.size).toBe(1)
      expect(google.calendars.get('cal1')?.size).toBe(13)
    })

    it('a hobby deleted on another device disappears here with its events', async () => {
      addGym()
      signIn()
      stop = startSync(meta)
      await run()
      const doc = backup() as { hobbies: unknown[]; deletedHobbies: Record<string, string> }
      google.drive.set('file1', {
        ...doc,
        hobbies: [],
        deletedHobbies: { gym: '2099-01-01T00:00:00.000Z' },
      })
      await run()
      expect(useApp.getState().data.hobbies).toEqual([])
      expect(google.live('cal1')).toEqual([])
    })

    it('never overwrites a backup written by a newer app version', async () => {
      addGym()
      signIn()
      google.drive.set('file1', { schemaVersion: 99, hobbies: [] })
      stop = startSync(meta)
      expect(await run()).toBe(false)
      expect(backup()).toEqual({ schemaVersion: 99, hobbies: [] })
      expect(google.calendars.size).toBe(0)
    })
  })
})

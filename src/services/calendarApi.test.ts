import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  calendarExists,
  createCalendar,
  deleteEvent,
  listHobbyEventIds,
  upsertEvent,
  type EventBody,
} from './calendarApi'
import { GoogleHttpError } from './googleAuth'
import { googleHttp } from './googleHttp'

const json = (body: unknown, status = 200) =>
  new Response(body === null ? null : JSON.stringify(body), { status })
const rateLimited = () => json({ error: { errors: [{ reason: 'rateLimitExceeded' }] } }, 403)

let calls: { url: string; method: string; body: unknown }[]
let replies: Response[]

beforeEach(() => {
  calls = []
  replies = []
  vi.spyOn(googleHttp, 'sleep').mockResolvedValue()
  vi.spyOn(googleHttp, 'fetch').mockImplementation((url, init) => {
    calls.push({
      url,
      method: init?.method ?? 'GET',
      body: init?.body ? (JSON.parse(String(init.body)) as unknown) : undefined,
    })
    return Promise.resolve(replies.shift() ?? json({}))
  })
})
afterEach(() => vi.restoreAllMocks())

const BODY = { summary: 'Gym · Paid' } as EventBody

describe('googleRequest via the calendar API', () => {
  it('creates the app calendar', async () => {
    replies = [json({ id: 'cal1' })]
    await expect(createCalendar('tok', 'My Subscriptions', 'Europe/Kyiv')).resolves.toBe('cal1')
    expect(calls[0]).toMatchObject({
      method: 'POST',
      url: 'https://www.googleapis.com/calendar/v3/calendars',
      body: { summary: 'My Subscriptions', timeZone: 'Europe/Kyiv' },
    })
  })

  it('retries rate limits and 5xx with backoff, then succeeds', async () => {
    replies = [json({}, 429), rateLimited(), json({}, 503), json({ id: 'cal1' })]
    await expect(createCalendar('tok', 'x', 'UTC')).resolves.toBe('cal1')
    expect(calls).toHaveLength(4)
    expect(googleHttp.sleep).toHaveBeenCalledTimes(3)
  })

  it('gives up after five attempts', async () => {
    replies = Array.from({ length: 5 }, () => json({}, 500))
    await expect(createCalendar('tok', 'x', 'UTC')).rejects.toMatchObject({ status: 500 })
    expect(calls).toHaveLength(5)
  })

  it('does not retry a plain 403 or a 401', async () => {
    replies = [json({ error: { errors: [{ reason: 'forbidden' }] } }, 403)]
    await expect(createCalendar('tok', 'x', 'UTC')).rejects.toBeInstanceOf(GoogleHttpError)
    replies = [json({}, 401)]
    await expect(createCalendar('tok', 'x', 'UTC')).rejects.toMatchObject({ status: 401 })
    expect(calls).toHaveLength(2)
  })

  it('reports whether the calendar still exists', async () => {
    replies = [json({ id: 'cal1' }), json({}, 404)]
    await expect(calendarExists('tok', 'cal1')).resolves.toBe(true)
    await expect(calendarExists('tok', 'cal1')).resolves.toBe(false)
    replies = [json({}, 401)]
    await expect(calendarExists('tok', 'cal1')).rejects.toMatchObject({ status: 401 })
  })
})

describe('events', () => {
  it('inserts with the client id', async () => {
    await upsertEvent('tok', 'c@group', 'ms00ab', BODY)
    expect(calls[0]).toMatchObject({
      method: 'POST',
      url: 'https://www.googleapis.com/calendar/v3/calendars/c%40group/events',
      body: { id: 'ms00ab', summary: 'Gym · Paid' },
    })
  })

  it('patches the existing event back to confirmed when the id is taken', async () => {
    replies = [json({}, 409), json({})]
    await upsertEvent('tok', 'c', 'ms00ab', BODY)
    expect(calls[1]).toMatchObject({
      method: 'PATCH',
      url: 'https://www.googleapis.com/calendar/v3/calendars/c/events/ms00ab',
      body: { summary: 'Gym · Paid', status: 'confirmed' },
    })
  })

  it('treats an already deleted event as deleted', async () => {
    replies = [json(null, 204), json({}, 410), json({}, 404)]
    for (let i = 0; i < 3; i++) await deleteEvent('tok', 'c', 'ms00ab')
    expect(calls.every((c) => c.method === 'DELETE')).toBe(true)
    replies = [json({}, 401)]
    await expect(deleteEvent('tok', 'c', 'ms00ab')).rejects.toMatchObject({ status: 401 })
  })

  it('lists every event of a hobby across pages', async () => {
    replies = [
      json({ items: [{ id: 'a' }, { id: 'b' }], nextPageToken: 'p2' }),
      json({ items: [{ id: 'c' }] }),
    ]
    await expect(listHobbyEventIds('tok', 'c', 'gym')).resolves.toEqual(['a', 'b', 'c'])
    const first = new URL(calls[0]?.url ?? '')
    expect(first.pathname).toBe('/calendar/v3/calendars/c/events')
    expect(first.searchParams.get('privateExtendedProperty')).toBe('hobbyId=gym')
    expect(new URL(calls[1]?.url ?? '').searchParams.get('pageToken')).toBe('p2')
  })

  it('sends small requests with keepalive and every request with a timeout', async () => {
    await deleteEvent('tok', 'c', 'ms00ab')
    const init = vi.mocked(googleHttp.fetch).mock.calls[0]?.[1]
    expect(init?.keepalive).toBe(true)
    expect(init?.signal).toBeInstanceOf(AbortSignal)
    await upsertEvent('tok', 'c', 'id', { summary: 'x'.repeat(40_000) } as EventBody)
    expect(vi.mocked(googleHttp.fetch).mock.calls[1]?.[1]?.keepalive).toBe(false)
  })

  it('surfaces network failures', async () => {
    vi.mocked(googleHttp.fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(upsertEvent('tok', 'c', 'id', BODY)).rejects.toBeInstanceOf(TypeError)
  })
})

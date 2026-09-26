import { GoogleHttpError } from './googleAuth'
import { googleRequest } from './googleHttp'

const BASE = 'https://www.googleapis.com/calendar/v3'

/** Body of an event as the sync layer builds it (Calendar API v3 `Event` subset). */
export interface EventBody {
  summary: string
  description: string
  colorId: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  reminders: { useDefault: false; overrides: { method: 'popup'; minutes: number }[] }
  attendees: { email: string }[]
  guestsCanModify: boolean
  guestsCanInviteOthers: boolean
  extendedProperties: { private: Record<string, string> }
}

const calendarUrl = (calendarId: string) => `${BASE}/calendars/${encodeURIComponent(calendarId)}`
const eventUrl = (calendarId: string, id: string) =>
  `${calendarUrl(calendarId)}/events/${encodeURIComponent(id)}`

/** Creates the app's secondary calendar (scope `calendar.app.created` allows only these). */
export const createCalendar = async (
  token: string,
  summary: string,
  timeZone: string,
): Promise<string> => {
  const { data } = await googleRequest<{ id: string }>(
    token,
    'calendars.insert',
    `${BASE}/calendars`,
    {
      method: 'POST',
      body: { summary, timeZone },
    },
  )
  if (!data?.id) throw new GoogleHttpError(500, 'calendars.insert')
  return data.id
}

/** False when the calendar is gone (deleted by the user in Google Calendar). */
export const calendarExists = async (token: string, calendarId: string): Promise<boolean> => {
  try {
    await googleRequest(token, 'calendars.get', calendarUrl(calendarId))
    return true
  } catch (e) {
    if (e instanceof GoogleHttpError && (e.status === 404 || e.status === 410)) return false
    throw e
  }
}

/** Renames the app's calendar (guests see its name as the events' organizer). */
export const renameCalendar = async (
  token: string,
  calendarId: string,
  summary: string,
): Promise<void> => {
  await googleRequest(token, 'calendars.patch', calendarUrl(calendarId), {
    method: 'PATCH',
    body: { summary },
  })
}

export const deleteCalendar = async (token: string, calendarId: string): Promise<void> => {
  try {
    await googleRequest(token, 'calendars.delete', calendarUrl(calendarId), { method: 'DELETE' })
  } catch (e) {
    if (!(e instanceof GoogleHttpError && (e.status === 404 || e.status === 410))) throw e
  }
}

/**
 * Insert with a client-chosen id; if the id exists (a retry, or a previously deleted event that
 * Google keeps as cancelled) patch it back to the wanted state instead. Idempotent.
 */
export const upsertEvent = async (
  token: string,
  calendarId: string,
  id: string,
  body: EventBody,
): Promise<void> => {
  try {
    // `sendUpdates=none`: guests get the events in their calendar without an email per session.
    await googleRequest(
      token,
      'events.insert',
      `${calendarUrl(calendarId)}/events?sendUpdates=none`,
      {
        method: 'POST',
        body: { id, ...body },
      },
    )
  } catch (e) {
    if (!(e instanceof GoogleHttpError && e.status === 409)) throw e
    await googleRequest(token, 'events.patch', `${eventUrl(calendarId, id)}?sendUpdates=none`, {
      method: 'PATCH',
      body: { ...body, status: 'confirmed' },
    })
  }
}

/**
 * Ids of every live event this app wrote for one hobby (by `extendedProperties.private.hobbyId`),
 * whoever wrote them — also events from other devices or from lost bookkeeping.
 */
export const listHobbyEventIds = async (
  token: string,
  calendarId: string,
  hobbyId: string,
): Promise<string[]> => {
  const ids: string[] = []
  let pageToken: string | undefined
  do {
    const params = new URLSearchParams({
      privateExtendedProperty: `hobbyId=${hobbyId}`,
      maxResults: '2500',
      fields: 'items(id),nextPageToken',
    })
    if (pageToken) params.set('pageToken', pageToken)
    const { data } = await googleRequest<{ items?: { id: string }[]; nextPageToken?: string }>(
      token,
      'events.list',
      `${calendarUrl(calendarId)}/events?${params.toString()}`,
    )
    ids.push(...(data?.items ?? []).map((e) => e.id))
    pageToken = data?.nextPageToken
  } while (pageToken)
  return ids
}

/** Already gone counts as done. */
export const deleteEvent = async (token: string, calendarId: string, id: string): Promise<void> => {
  try {
    await googleRequest(token, 'events.delete', `${eventUrl(calendarId, id)}?sendUpdates=none`, {
      method: 'DELETE',
    })
  } catch (e) {
    if (!(e instanceof GoogleHttpError && (e.status === 404 || e.status === 410))) throw e
  }
}

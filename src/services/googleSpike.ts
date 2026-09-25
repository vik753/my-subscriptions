// TEMPORARY (roadmap stage 1 spike): proves the granted scopes work against the real APIs.
// Remove together with src/screens/AuthSpike once the Calendar/Drive services exist (stages 8–9).

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const DRIVE_API = 'https://www.googleapis.com/drive/v3'

const call = async (url: string, token: string, init: RequestInit = {}): Promise<Response> => {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${new URL(url).pathname} → ${res.status}`)
  return res
}

/** Creates a throwaway secondary calendar and deletes it again (calendar.app.created). */
export const checkCalendar = async (token: string): Promise<string> => {
  const res = await call(`${CALENDAR_API}/calendars`, token, {
    method: 'POST',
    body: JSON.stringify({ summary: 'My Subscriptions (sign-in check)' }),
  })
  const { id } = (await res.json()) as { id: string }
  await call(`${CALENDAR_API}/calendars/${encodeURIComponent(id)}`, token, { method: 'DELETE' })
  return 'calendar created and deleted'
}

/** Lists files in the hidden app folder (drive.appdata). */
export const checkDrive = async (token: string): Promise<string> => {
  const res = await call(`${DRIVE_API}/files?spaces=appDataFolder&fields=files(id,name)`, token)
  const { files } = (await res.json()) as { files: unknown[] }
  return `appDataFolder reachable, ${files.length} file(s)`
}

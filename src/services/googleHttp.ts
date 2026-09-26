import { GoogleHttpError } from './googleAuth'

const MAX_ATTEMPTS = 5
// A request frozen by a suspended app (iOS stops PWAs in the background) must fail, not hang.
const TIMEOUT_MS = 20_000
// `keepalive` lets a small request finish even if the app goes to the background right after it
// starts; browsers cap keepalive bodies at 64 KB, so large uploads go without it.
const KEEPALIVE_MAX = 32_000

/** Seams for tests: no real waiting, no real network. */
export const googleHttp = {
  fetch: (input: string, init?: RequestInit) => fetch(input, init),
  sleep: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
}

const retriable = async (res: Response): Promise<boolean> => {
  if (res.status === 429 || res.status >= 500) return true
  if (res.status !== 403) return false
  // 403 is also "forbidden for real"; only the rate-limit reasons are worth retrying.
  const body = (await res
    .clone()
    .json()
    .catch(() => null)) as { error?: { errors?: { reason?: string }[] } } | null
  return (body?.error?.errors ?? []).some(
    (e) => e.reason === 'rateLimitExceeded' || e.reason === 'userRateLimitExceeded',
  )
}

/**
 * Authorized JSON request to a Google API with exponential backoff on rate limits and 5xx.
 * Throws GoogleHttpError on HTTP errors; a network failure rejects with fetch's TypeError.
 */
export const googleRequest = async <T>(
  token: string,
  what: string,
  url: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<{ status: number; data: T | null }> => {
  for (let attempt = 1; ; attempt++) {
    const body =
      init.body === undefined
        ? undefined
        : typeof init.body === 'string'
          ? init.body
          : JSON.stringify(init.body)
    const res = await googleHttp.fetch(url, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...init.headers,
      },
      ...(body !== undefined && { body }),
      keepalive: (body?.length ?? 0) < KEEPALIVE_MAX,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (res.ok) {
      const text = await res.text()
      return { status: res.status, data: text ? (JSON.parse(text) as T) : null }
    }
    if (attempt < MAX_ATTEMPTS && (await retriable(res))) {
      await googleHttp.sleep(2 ** attempt * 500 + Math.random() * 250)
      continue
    }
    throw new GoogleHttpError(res.status, what)
  }
}

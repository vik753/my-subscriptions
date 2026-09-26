// Google OAuth 2.0 token flow via full-page redirect (no popups — unreliable in iOS standalone PWAs,
// no client secret — there is no backend). Silent renewal = the same redirect with `prompt=none`.

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo'

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.app.created',
  'https://www.googleapis.com/auth/drive.appdata',
] as const

export interface AuthRequest {
  clientId: string
  redirectUri: string
  state: string
  /** `none` = silent renewal; fails with `interaction_required` / `login_required` if the user must act. */
  prompt?: 'none' | 'consent' | 'select_account'
  loginHint?: string
}

export const buildAuthUrl = ({
  clientId,
  redirectUri,
  state,
  prompt,
  loginHint,
}: AuthRequest): string => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: GOOGLE_SCOPES.join(' '),
    include_granted_scopes: 'true',
    state,
  })
  if (prompt) params.set('prompt', prompt)
  if (loginHint) params.set('login_hint', loginHint)
  return `${AUTH_ENDPOINT}?${params.toString()}`
}

export type AuthResponse =
  | { type: 'token'; accessToken: string; expiresAt: number; scopes: string[]; state: string }
  | { type: 'error'; error: string; state: string }

/** Parses the redirect fragment (`#access_token=…` or `#error=…`); null when it is not an OAuth response. */
export const parseAuthResponse = (hash: string, nowMs: number): AuthResponse | null => {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const state = params.get('state') ?? ''
  const error = params.get('error')
  if (error) return { type: 'error', error, state }
  const accessToken = params.get('access_token')
  if (!accessToken) return null
  const expiresIn = Number(params.get('expires_in') ?? 0)
  return {
    type: 'token',
    accessToken,
    expiresAt: nowMs + expiresIn * 1000,
    scopes: (params.get('scope') ?? '').split(' ').filter(Boolean),
    state,
  }
}

export const missingScopes = (granted: readonly string[]): string[] =>
  GOOGLE_SCOPES.filter((s) => s.startsWith('https://') && !granted.includes(s))

export interface GoogleUser {
  email: string
  name: string
  picture?: string
}

/** HTTP error from a Google API; `status` 401 means the token is no longer valid. */
export class GoogleHttpError extends Error {
  readonly status: number
  constructor(status: number, what: string) {
    super(`${what} → ${status}`)
    this.status = status
  }
}

/** Throws GoogleHttpError on HTTP errors; network failures reject with a TypeError from fetch. */
export const fetchUser = async (accessToken: string): Promise<GoogleUser> => {
  const res = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new GoogleHttpError(res.status, 'userinfo')
  const data = (await res.json()) as { email?: unknown; name?: unknown; picture?: string }
  // A profile without an email is useless (and would break the account row): treat as a failure.
  if (typeof data.email !== 'string' || !data.email) throw new GoogleHttpError(502, 'userinfo')
  return {
    email: data.email,
    name: typeof data.name === 'string' && data.name ? data.name : data.email,
    ...(data.picture && { picture: data.picture }),
  }
}

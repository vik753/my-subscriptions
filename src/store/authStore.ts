import { create } from 'zustand'
import {
  buildAuthUrl,
  fetchUser,
  GoogleHttpError,
  missingScopes,
  parseAuthResponse,
  type GoogleUser,
} from '../services/googleAuth'

// Access token + user live in sessionStorage (survive the OAuth redirect, gone when the app is killed).
// The email is a tiny pref in localStorage — the `login_hint` that makes silent renewal possible.
const TOKEN_KEY = 'auth.token'
const USER_KEY = 'auth.user'
const STATE_KEY = 'auth.state'
const SILENT_KEY = 'auth.silent' // 'pending' → redirect in flight; 'used' → no more silent attempts this session
const HINT_KEY = 'auth.loginHint'
const RETURN_KEY = 'auth.returnTo' // Google redirects back to the app root; this restores the route
const RENEW_MARGIN_MS = 5 * 60_000

/** `offline` = we have a session but can't reach Google right now; local work continues. */
export type AuthStatus = 'checking' | 'signedOut' | 'signedIn' | 'offline' | 'error' | 'denied'

interface StoredToken {
  accessToken: string
  expiresAt: number
}

interface AuthState {
  status: AuthStatus
  /** Has signed in on this device before (and not signed out) — gates the sign-in screen. */
  known: boolean
  user: GoogleUser | null
  expiresAt: number | null
  error: string | null
  /** How the current token was obtained — spike diagnostics. */
  lastGrant: 'interactive' | 'silent' | 'restored' | null
  init: () => Promise<void>
  resume: () => void
  signIn: () => void
  signOut: () => void
  /** A Google API answered 401: drop the token, keep the account → "Sign in again". */
  expire: () => void
}

const safe = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn()
  } catch {
    return fallback
  }
}

const session = {
  get: (k: string) => safe(() => sessionStorage.getItem(k), null),
  set: (k: string, v: string) => safe(() => sessionStorage.setItem(k, v), undefined),
  del: (k: string) => safe(() => sessionStorage.removeItem(k), undefined),
}
const local = {
  get: (k: string) => safe(() => localStorage.getItem(k), null),
  set: (k: string, v: string) => safe(() => localStorage.setItem(k, v), undefined),
  del: (k: string) => safe(() => localStorage.removeItem(k), undefined),
}
const readJson = <T>(k: string): T | null =>
  safe(() => JSON.parse(session.get(k) ?? 'null') as T | null, null)

/** The current access token while it is still valid, for API calls. */
export const accessToken = (): string | null => {
  const token = readJson<StoredToken>(TOKEN_KEY)
  return token && token.expiresAt > Date.now() ? token.accessToken : null
}

/** Seam for tests: jsdom can't navigate. */
export const authNavigation = {
  go: (url: string) => window.location.assign(url),
}

const redirect = (prompt?: 'none') => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID is not set')
  const state = crypto.randomUUID()
  session.set(STATE_KEY, state)
  session.set(RETURN_KEY, window.location.pathname + window.location.search)
  const loginHint = local.get(HINT_KEY) ?? undefined
  authNavigation.go(
    buildAuthUrl({
      clientId,
      redirectUri: `${window.location.origin}${import.meta.env.BASE_URL}`,
      state,
      ...(prompt && { prompt }),
      ...(loginHint && { loginHint }),
    }),
  )
}

const clearSession = () => {
  session.del(TOKEN_KEY)
  session.del(USER_KEY)
}

// init() must run once per launch even under React StrictMode's double effects.
let running: Promise<void> | null = null

const runInit = async (set: (s: Partial<AuthState>) => void): Promise<void> => {
  set({ known: local.get(HINT_KEY) != null })
  const response = parseAuthResponse(window.location.hash, Date.now())
  let grant: AuthState['lastGrant'] = 'restored'
  let token = readJson<StoredToken>(TOKEN_KEY)
  let fresh = false

  if (response) {
    const returnTo = session.get(RETURN_KEY) ?? window.location.pathname + window.location.search
    session.del(RETURN_KEY)
    history.replaceState(null, '', returnTo)
    const expected = session.get(STATE_KEY)
    session.del(STATE_KEY)
    const wasSilent = session.get(SILENT_KEY) === 'pending'
    if (wasSilent) session.set(SILENT_KEY, 'used')
    // Anything not initiated by us (crafted link, replay) is ignored.
    if (!expected || response.state !== expected)
      return set({ status: 'error', error: 'state_mismatch' })

    if (response.type === 'error') {
      if (response.error === 'access_denied')
        return set({ status: 'denied', error: response.error })
      // interaction_required / login_required after a silent attempt → the user must sign in.
      return set({ status: wasSilent ? 'signedOut' : 'error', error: response.error })
    }
    const missing = missingScopes(response.scopes)
    if (missing.length)
      return set({ status: 'denied', error: `missing scopes: ${missing.join(', ')}` })
    token = { accessToken: response.accessToken, expiresAt: response.expiresAt }
    session.set(TOKEN_KEY, JSON.stringify(token))
    grant = wasSilent ? 'silent' : 'interactive'
    fresh = true
  }

  const usable = token && (fresh || token.expiresAt - Date.now() > RENEW_MARGIN_MS)
  if (!token || !usable) {
    const cachedUser = readJson<GoogleUser>(USER_KEY)
    if (!navigator.onLine) {
      // Never navigate to accounts.google.com offline — the standalone app would land on an error page.
      // A known account stays offline even without a cached profile: back online, resume() renews it.
      return set(
        cachedUser || local.get(HINT_KEY) != null
          ? { status: 'offline', user: cachedUser }
          : { status: 'signedOut' },
      )
    }
    // One silent attempt per app session, only for returning users.
    if (local.get(HINT_KEY) != null && session.get(SILENT_KEY) == null) {
      session.set(SILENT_KEY, 'pending')
      return redirect('none')
    }
    clearSession()
    return set({ status: 'signedOut', user: null, expiresAt: null })
  }

  try {
    const user = await fetchUser(token.accessToken)
    local.set(HINT_KEY, user.email)
    session.set(USER_KEY, JSON.stringify(user))
    set({
      status: 'signedIn',
      known: true,
      user,
      expiresAt: token.expiresAt,
      lastGrant: grant,
      error: null,
    })
  } catch (e) {
    if (e instanceof GoogleHttpError && e.status === 401) {
      clearSession()
      return set({ status: 'signedOut', user: null, expiresAt: null, error: 'token_revoked' })
    }
    // Network failure: keep the session, work offline, retry when back online.
    set({
      status: 'offline',
      user: readJson<GoogleUser>(USER_KEY),
      expiresAt: token.expiresAt,
      lastGrant: grant,
      error: (e as Error).message,
    })
  }
}

export const useAuth = create<AuthState>((set) => ({
  status: 'checking',
  known: false,
  user: null,
  expiresAt: null,
  error: null,
  lastGrant: null,

  init: () => {
    running ??= runInit(set).finally(() => {
      running = null
    })
    return running
  },

  /** Foreground / back online: re-check when the token is expiring or we were offline. */
  resume: () => {
    const { status, expiresAt, init } = useAuth.getState()
    const expiring = expiresAt != null && expiresAt - Date.now() < RENEW_MARGIN_MS
    if (status === 'offline' || (status === 'signedIn' && expiring)) void init()
  },

  signIn: () => {
    session.del(SILENT_KEY)
    redirect()
  },

  expire: () => {
    clearSession()
    set({ status: 'signedOut', expiresAt: null, error: 'token_expired' })
  },

  signOut: () => {
    clearSession()
    local.del(HINT_KEY)
    set({
      status: 'signedOut',
      known: false,
      user: null,
      expiresAt: null,
      lastGrant: null,
      error: null,
    })
  },
}))

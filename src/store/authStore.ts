import { create } from 'zustand'
import {
  buildAuthUrl,
  fetchUser,
  GoogleHttpError,
  missingScopes,
  parseAuthResponse,
  type GoogleUser,
} from '../services/googleAuth'
import { checkCalendar, checkDrive } from '../services/googleSpike'

// Access token + user live in sessionStorage (survive the OAuth redirect, gone when the app is killed).
// The email is a tiny pref in localStorage — the `login_hint` that makes silent renewal possible.
const TOKEN_KEY = 'auth.token'
const USER_KEY = 'auth.user'
const STATE_KEY = 'auth.state'
const SILENT_KEY = 'auth.silent' // 'pending' → redirect in flight; 'used' → no more silent attempts this session
const HINT_KEY = 'auth.loginHint'
const RENEW_MARGIN_MS = 5 * 60_000

/** `offline` = we have a session but can't reach Google right now; local work continues. */
export type AuthStatus = 'checking' | 'signedOut' | 'signedIn' | 'offline' | 'error' | 'denied'

interface StoredToken {
  accessToken: string
  expiresAt: number
}

interface AuthState {
  status: AuthStatus
  user: GoogleUser | null
  expiresAt: number | null
  error: string | null
  /** How the current token was obtained — spike diagnostics. */
  lastGrant: 'interactive' | 'silent' | 'restored' | null
  checks: string[]
  init: () => Promise<void>
  resume: () => void
  signIn: () => void
  signOut: () => void
  forgetToken: () => void
  runChecks: () => Promise<void>
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

/** Seam for tests: jsdom can't navigate. */
export const authNavigation = {
  go: (url: string) => window.location.assign(url),
  reload: () => window.location.reload(),
}

const redirect = (prompt?: 'none') => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID is not set')
  const state = crypto.randomUUID()
  session.set(STATE_KEY, state)
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
  const response = parseAuthResponse(window.location.hash, Date.now())
  let grant: AuthState['lastGrant'] = 'restored'
  let token = readJson<StoredToken>(TOKEN_KEY)
  let fresh = false

  if (response) {
    history.replaceState(null, '', window.location.pathname + window.location.search)
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
      return set(cachedUser ? { status: 'offline', user: cachedUser } : { status: 'signedOut' })
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
    set({ status: 'signedIn', user, expiresAt: token.expiresAt, lastGrant: grant, error: null })
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
  user: null,
  expiresAt: null,
  error: null,
  lastGrant: null,
  checks: [],

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

  signOut: () => {
    clearSession()
    local.del(HINT_KEY)
    set({
      status: 'signedOut',
      user: null,
      expiresAt: null,
      lastGrant: null,
      checks: [],
      error: null,
    })
  },

  /** Spike: drop the token but keep the hint, then reload → exercises silent renewal. */
  forgetToken: () => {
    clearSession()
    session.del(SILENT_KEY)
    authNavigation.reload()
  },

  runChecks: async () => {
    const token = readJson<StoredToken>(TOKEN_KEY)
    if (!token) return
    set({ checks: ['running…'] })
    const results = await Promise.allSettled([
      checkCalendar(token.accessToken),
      checkDrive(token.accessToken),
    ])
    set({
      checks: results.map(
        (r, i) =>
          `${i === 0 ? 'Calendar' : 'Drive'}: ${r.status === 'fulfilled' ? '✅ ' + r.value : '❌ ' + String(r.reason)}`,
      ),
    })
  },
}))

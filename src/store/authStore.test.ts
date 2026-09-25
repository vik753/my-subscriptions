import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authNavigation, useAuth } from './authStore'

const initial = useAuth.getState()
const API_SCOPES =
  'openid email profile https://www.googleapis.com/auth/calendar.app.created https://www.googleapis.com/auth/drive.appdata'
const USER = { email: 'me@gmail.com', name: 'Me' }

let go: ReturnType<typeof vi.spyOn>
let online = true

const setHash = (hash: string) => history.replaceState(null, '', `/${hash}`)
const tokenHash = (state: string, scope = API_SCOPES) =>
  `#access_token=tok&expires_in=3599&scope=${encodeURIComponent(scope)}&state=${state}`
const mockUserinfo = (res: Promise<Response> | Response) => {
  const fetchMock = vi.fn(() => Promise.resolve(res))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  setHash('')
  online = true
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online)
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'cid')
  go = vi.spyOn(authNavigation, 'go').mockImplementation(() => {})
  useAuth.setState(initial, true)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('authStore.init', () => {
  it('shows sign-in for a new user without redirecting', async () => {
    await useAuth.getState().init()
    expect(useAuth.getState().status).toBe('signedOut')
    expect(go).not.toHaveBeenCalled()
  })

  it('makes exactly one silent attempt for a returning user', async () => {
    localStorage.setItem('auth.loginHint', USER.email)
    await useAuth.getState().init()
    expect(go).toHaveBeenCalledTimes(1)
    const url = new URL(String(go.mock.calls[0]?.[0]))
    expect(url.searchParams.get('prompt')).toBe('none')
    expect(url.searchParams.get('login_hint')).toBe(USER.email)
  })

  it('falls back to sign-in when the silent attempt needs interaction, without looping', async () => {
    localStorage.setItem('auth.loginHint', USER.email)
    sessionStorage.setItem('auth.state', 'S')
    sessionStorage.setItem('auth.silent', 'pending')
    setHash('#error=interaction_required&state=S')
    await useAuth.getState().init()
    expect(useAuth.getState().status).toBe('signedOut')
    expect(window.location.hash).toBe('')
    await useAuth.getState().init()
    expect(go).not.toHaveBeenCalled()
  })

  it('rejects responses with an unexpected state', async () => {
    sessionStorage.setItem('auth.state', 'S')
    setHash('#error=access_denied&state=EVIL')
    await useAuth.getState().init()
    expect(useAuth.getState()).toMatchObject({ status: 'error', error: 'state_mismatch' })
  })

  it('rejects responses when no request was made', async () => {
    setHash(tokenHash('S'))
    await useAuth.getState().init()
    expect(useAuth.getState().error).toBe('state_mismatch')
    expect(sessionStorage.getItem('auth.token')).toBeNull()
  })

  it('reports a denied consent', async () => {
    sessionStorage.setItem('auth.state', 'S')
    setHash('#error=access_denied&state=S')
    await useAuth.getState().init()
    expect(useAuth.getState().status).toBe('denied')
  })

  it('reports an interactive error', async () => {
    sessionStorage.setItem('auth.state', 'S')
    setHash('#error=server_error&state=S')
    await useAuth.getState().init()
    expect(useAuth.getState()).toMatchObject({ status: 'error', error: 'server_error' })
  })

  it('treats unchecked scopes as denied', async () => {
    sessionStorage.setItem('auth.state', 'S')
    setHash(tokenHash('S', 'openid email'))
    await useAuth.getState().init()
    expect(useAuth.getState().status).toBe('denied')
  })

  it('signs in after an interactive grant and remembers the account', async () => {
    mockUserinfo(json(USER))
    sessionStorage.setItem('auth.state', 'S')
    setHash(tokenHash('S'))
    await useAuth.getState().init()
    expect(useAuth.getState()).toMatchObject({
      status: 'signedIn',
      user: USER,
      lastGrant: 'interactive',
    })
    expect(localStorage.getItem('auth.loginHint')).toBe(USER.email)
    expect(sessionStorage.getItem('auth.state')).toBeNull()
    expect(window.location.hash).toBe('')
  })

  it('labels a token from the silent attempt', async () => {
    mockUserinfo(json(USER))
    sessionStorage.setItem('auth.state', 'S')
    sessionStorage.setItem('auth.silent', 'pending')
    setHash(tokenHash('S'))
    await useAuth.getState().init()
    expect(useAuth.getState().lastGrant).toBe('silent')
  })

  it('accepts a freshly issued token even if it is short-lived', async () => {
    mockUserinfo(json(USER))
    sessionStorage.setItem('auth.state', 'S')
    setHash('#access_token=tok&expires_in=60&scope=' + encodeURIComponent(API_SCOPES) + '&state=S')
    await useAuth.getState().init()
    expect(useAuth.getState().status).toBe('signedIn')
    expect(go).not.toHaveBeenCalled()
  })

  it('restores a valid token from the session', async () => {
    mockUserinfo(json(USER))
    sessionStorage.setItem(
      'auth.token',
      JSON.stringify({ accessToken: 't', expiresAt: Date.now() + 3_600_000 }),
    )
    await useAuth.getState().init()
    expect(useAuth.getState()).toMatchObject({ status: 'signedIn', lastGrant: 'restored' })
  })

  it('keeps the session and goes offline when Google is unreachable', async () => {
    mockUserinfo(Promise.reject(new TypeError('Failed to fetch')))
    sessionStorage.setItem(
      'auth.token',
      JSON.stringify({ accessToken: 't', expiresAt: Date.now() + 3_600_000 }),
    )
    sessionStorage.setItem('auth.user', JSON.stringify(USER))
    await useAuth.getState().init()
    expect(useAuth.getState()).toMatchObject({ status: 'offline', user: USER })
    expect(sessionStorage.getItem('auth.token')).not.toBeNull()
  })

  it('drops a revoked token', async () => {
    mockUserinfo(json({}, 401))
    sessionStorage.setItem(
      'auth.token',
      JSON.stringify({ accessToken: 't', expiresAt: Date.now() + 3_600_000 }),
    )
    await useAuth.getState().init()
    expect(useAuth.getState()).toMatchObject({ status: 'signedOut', error: 'token_revoked' })
    expect(sessionStorage.getItem('auth.token')).toBeNull()
  })

  it('never navigates to Google while offline', async () => {
    online = false
    localStorage.setItem('auth.loginHint', USER.email)
    sessionStorage.setItem('auth.user', JSON.stringify(USER))
    await useAuth.getState().init()
    expect(useAuth.getState()).toMatchObject({ status: 'offline', user: USER })
    expect(go).not.toHaveBeenCalled()
  })

  it('shows sign-in when offline without a known account', async () => {
    online = false
    await useAuth.getState().init()
    expect(useAuth.getState().status).toBe('signedOut')
  })

  it('runs once when called concurrently (StrictMode double effects)', async () => {
    const fetchMock = mockUserinfo(json(USER))
    sessionStorage.setItem(
      'auth.token',
      JSON.stringify({ accessToken: 't', expiresAt: Date.now() + 3_600_000 }),
    )
    await Promise.all([useAuth.getState().init(), useAuth.getState().init()])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('authStore actions', () => {
  it('resume re-checks after being offline', async () => {
    const fetchMock = mockUserinfo(json(USER))
    sessionStorage.setItem(
      'auth.token',
      JSON.stringify({ accessToken: 't', expiresAt: Date.now() + 3_600_000 }),
    )
    useAuth.setState({ status: 'offline' })
    useAuth.getState().resume()
    await vi.waitFor(() => expect(useAuth.getState().status).toBe('signedIn'))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('resume does nothing for a healthy session', () => {
    const fetchMock = mockUserinfo(json(USER))
    useAuth.setState({ status: 'signedIn', expiresAt: Date.now() + 3_600_000 })
    useAuth.getState().resume()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('signIn starts an interactive redirect', () => {
    sessionStorage.setItem('auth.silent', 'used')
    useAuth.getState().signIn()
    const url = new URL(String(go.mock.calls[0]?.[0]))
    expect(url.searchParams.has('prompt')).toBe(false)
    expect(sessionStorage.getItem('auth.silent')).toBeNull()
  })

  it('signOut forgets the session and the account hint', () => {
    sessionStorage.setItem('auth.token', '{}')
    localStorage.setItem('auth.loginHint', USER.email)
    useAuth.getState().signOut()
    expect(useAuth.getState().status).toBe('signedOut')
    expect(sessionStorage.getItem('auth.token')).toBeNull()
    expect(localStorage.getItem('auth.loginHint')).toBeNull()
  })
})

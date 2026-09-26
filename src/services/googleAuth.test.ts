import { describe, expect, it, vi } from 'vitest'
import {
  buildAuthUrl,
  fetchUser,
  GoogleHttpError,
  missingScopes,
  parseAuthResponse,
} from './googleAuth'

describe('buildAuthUrl', () => {
  it('requests a token via redirect with the app scopes and optional silent prompt', () => {
    const url = new URL(
      buildAuthUrl({
        clientId: 'cid',
        redirectUri: 'https://vik753.github.io/my-subscriptions/',
        state: 's1',
        prompt: 'none',
        loginHint: 'me@gmail.com',
      }),
    )
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('response_type')).toBe('token')
    expect(url.searchParams.get('redirect_uri')).toBe('https://vik753.github.io/my-subscriptions/')
    expect(url.searchParams.get('scope')).toContain('calendar.app.created')
    expect(url.searchParams.get('scope')).toContain('drive.appdata')
    expect(url.searchParams.get('prompt')).toBe('none')
    expect(url.searchParams.get('login_hint')).toBe('me@gmail.com')
  })

  it('omits prompt and login_hint when not given', () => {
    const url = new URL(
      buildAuthUrl({ clientId: 'cid', redirectUri: 'http://localhost:5173/', state: 's' }),
    )
    expect(url.searchParams.has('prompt')).toBe(false)
    expect(url.searchParams.has('login_hint')).toBe(false)
  })
})

describe('parseAuthResponse', () => {
  it('parses a token response and computes the expiry', () => {
    const res = parseAuthResponse(
      '#access_token=abc&token_type=Bearer&expires_in=3599&scope=email%20https://www.googleapis.com/auth/drive.appdata&state=s1',
      1_000,
    )
    expect(res).toEqual({
      type: 'token',
      accessToken: 'abc',
      expiresAt: 1_000 + 3_599_000,
      scopes: ['email', 'https://www.googleapis.com/auth/drive.appdata'],
      state: 's1',
    })
  })

  it('parses an error response', () => {
    expect(parseAuthResponse('#error=interaction_required&state=s2', 0)).toEqual({
      type: 'error',
      error: 'interaction_required',
      state: 's2',
    })
  })

  it('returns null for unrelated fragments', () => {
    expect(parseAuthResponse('', 0)).toBeNull()
    expect(parseAuthResponse('#section', 0)).toBeNull()
  })

  it('tolerates a token response without scope or expiry', () => {
    const res = parseAuthResponse('#access_token=x', 5)
    expect(res).toMatchObject({ type: 'token', expiresAt: 5, scopes: [], state: '' })
  })
})

describe('missingScopes', () => {
  it('lists API scopes the user did not grant', () => {
    expect(missingScopes(['https://www.googleapis.com/auth/drive.appdata'])).toEqual([
      'https://www.googleapis.com/auth/calendar.app.created',
    ])
  })
})

describe('fetchUser', () => {
  const reply = (body: unknown) =>
    vi.stubGlobal('fetch', () => Promise.resolve(new Response(JSON.stringify(body))))

  it('reads the profile; name falls back to the email', async () => {
    reply({ email: 'me@gmail.com' })
    await expect(fetchUser('t')).resolves.toEqual({ email: 'me@gmail.com', name: 'me@gmail.com' })
  })

  it('treats a profile without an email as a failure', async () => {
    reply({ files: [] })
    await expect(fetchUser('t')).rejects.toBeInstanceOf(GoogleHttpError)
    vi.unstubAllGlobals()
  })
})

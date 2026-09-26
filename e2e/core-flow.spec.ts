import { expect, test } from '@playwright/test'

// Signed-in session without Google: a valid token in sessionStorage + mocked userinfo.
// Google Calendar and Drive are faked: every call succeeds; the app calendar is `cal1`.
const calendarWrites: { method: string; body: Record<string, unknown> }[] = []

test.beforeEach(async ({ page }) => {
  calendarWrites.length = 0
  await page.route('https://www.googleapis.com/oauth2/v3/userinfo', (route) =>
    route.fulfill({ json: { email: 'me@gmail.com', name: 'Me' } }),
  )
  await page.route('https://www.googleapis.com/calendar/v3/**', (route) => {
    const req = route.request()
    if (req.method() !== 'GET')
      calendarWrites.push({
        method: req.method(),
        body: (req.postDataJSON() ?? {}) as Record<string, unknown>,
      })
    return route.fulfill({ json: req.method() === 'POST' ? { id: 'cal1' } : {} })
  })
  // Drive backup: no file yet; creating and writing it succeed.
  await page.route(/https:\/\/www\.googleapis\.com\/(upload\/)?drive\/v3\/.*/, (route) => {
    const method = route.request().method()
    return route.fulfill({
      json: method === 'GET' ? { files: [] } : method === 'POST' ? { id: 'file1' } : {},
    })
  })
  await page.addInitScript(() => {
    sessionStorage.setItem(
      'auth.token',
      JSON.stringify({ accessToken: 'test', expiresAt: Date.now() + 3_600_000 }),
    )
  })
})

test('shows sign-in without a session', async ({ browser }) => {
  const page = await browser.newPage()
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible()
  await page.close()
})

test('create a hobby, see it in detail and on Home', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'No passes yet' })).toBeVisible()
  await page.getByRole('button', { name: 'Add hobby' }).click()

  await page.getByLabel('Name').fill('Gym')
  await page.getByRole('button', { name: 'Mo', exact: true }).click()
  await page.getByLabel('Monday', { exact: true }).fill('10:00')
  await page.getByRole('textbox', { name: 'Monday, min' }).fill('60')
  await page.getByLabel('Sessions in pass').fill('8')
  await page.getByLabel('Pass price').fill('8000')
  await page.getByRole('button', { name: 'Create and add to calendar' }).click()

  await expect(page.getByRole('heading', { name: 'Gym' })).toBeVisible()
  await expect(page.locator('dl')).toContainText('8')
  await expect(page.locator('dl')).toContainText('1 000 ₴')

  await page.getByRole('button', { name: 'Subscriptions' }).click()
  const card = page.getByRole('button', { name: /Gym/ })
  await expect(card).toHaveAccessibleName('Gym, 8 paid sessions left')
  await expect(card.locator('..')).toContainText('8paid sessions left')

  // Deep link survives a reload (router + persistence).
  await card.click()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Gym' })).toBeVisible()
})

test('a returning user with an expired session keeps their data', async ({ browser }) => {
  const page = await browser.newPage()
  // Known account, no token, silent renewal already spent this session.
  await page.addInitScript(() => {
    localStorage.setItem('auth.loginHint', 'me@gmail.com')
    sessionStorage.setItem('auth.silent', 'used')
  })
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'No passes yet' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Add hobby' }).click()
  await page.getByRole('button', { name: 'Mo', exact: true }).click()
  await page.getByLabel('Monday', { exact: true }).fill('10:00')
  await page.getByLabel('Sessions in pass').fill('8')
  await page.getByRole('button', { name: 'Create and add to calendar' }).click()
  await expect(page.getByText('Sign in again to sync')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  await page.close()
})

test('on open, past sessions are asked about and saved', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-24T10:02:00'))
  await page.goto('./')
  await page.getByRole('button', { name: 'Add hobby' }).click()
  await page.getByLabel('Name').fill('Gym')
  await page.getByRole('button', { name: 'Mo', exact: true }).click()
  await page.getByLabel('Monday', { exact: true }).fill('10:00')
  await page.getByLabel('First session').fill('2026-09-07')
  await page.getByLabel('Sessions in pass').fill('8')
  await page.getByRole('button', { name: 'Create and add to calendar' }).click()
  await expect(page.getByRole('heading', { name: 'Gym' })).toBeVisible()

  // Reopening the app runs the check: Sep 7, 14, 21 have ended.
  await page.reload()
  const sheet = page.getByRole('dialog', { name: 'Mark past sessions' })
  await expect(sheet.getByText('3 unmarked sessions')).toBeVisible()
  await sheet.getByRole('button', { name: 'Mark all as attended' }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Marked: 3')).toBeVisible()
  await expect(sheet).toBeHidden()
  await expect(page.locator('dl')).toContainText('5')
})

test('sessions are written to the app calendar', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-24T10:02:00'))
  await page.goto('./')
  await page.getByRole('button', { name: 'Add hobby' }).click()
  await page.getByLabel('Name').fill('Gym')
  await page.getByRole('button', { name: 'Mo', exact: true }).click()
  await page.getByLabel('Monday', { exact: true }).fill('10:00')
  await page.getByLabel('Sessions in pass').fill('2')
  await page.getByRole('button', { name: 'Create and add to calendar' }).click()

  await expect
    .poll(() => calendarWrites.filter((w) => typeof w.body.summary === 'string').length)
    .toBe(13) // the calendar + 12 Mondays (Sep 28 … Dec 14)
  expect(calendarWrites[0]?.body).toMatchObject({ summary: 'My Subscriptions' })
  expect(calendarWrites.map((w) => w.body.summary)).toContain('Gym · Paid')
  expect(calendarWrites.map((w) => w.body.summary)).toContain('Gym · Unpaid')
})

test('settings: language and scheme apply at once, About is reachable', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: /Sea/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-scheme', 'sea')
  await page.getByRole('button', { name: /Русский/ }).click()
  await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible()
  await page.getByRole('button', { name: /О приложении/ }).click()
  await expect(page.getByRole('heading', { name: 'My Subscriptions' })).toBeVisible()
})

import { expect, test } from '@playwright/test'

// Signed-in session without Google: a valid token in sessionStorage + mocked userinfo.
test.beforeEach(async ({ page }) => {
  await page.route('https://www.googleapis.com/oauth2/v3/userinfo', (route) =>
    route.fulfill({ json: { email: 'me@gmail.com', name: 'Me' } }),
  )
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
  await expect(card).toContainText('8paid sessions left')

  // Deep link survives a reload (router + persistence).
  await card.click()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Gym' })).toBeVisible()
})

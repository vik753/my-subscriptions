import { expect, test } from '@playwright/test'

// Google's OAuth review needs these public pages; the app's SPA fallback must not swallow them.
test('privacy policy is served as its own page with the Limited Use statement', async ({
  page,
}) => {
  await page.goto('./privacy.html')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy Policy')
  await expect(page.getByText(/Limited Use requirements/)).toBeVisible()
  await expect(page.getByText('calendar.app.created', { exact: false }).first()).toBeVisible()
})

test('the homepage describes the app and links the privacy policy', async ({ page }) => {
  await page.goto('./home.html')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My Subscriptions')
  await page.getByRole('link', { name: 'Privacy Policy' }).click()
  await expect(page).toHaveURL(/privacy\.html$/)
})

test('the Search Console verification file is served as is', async ({ request }) => {
  const res = await request.get('./google4aaee23d012c9b90.html')
  expect(res.ok()).toBe(true)
  expect(await res.text()).toContain('google-site-verification: google4aaee23d012c9b90.html')
})

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

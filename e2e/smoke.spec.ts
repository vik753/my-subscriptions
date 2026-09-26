import { expect, test } from '@playwright/test'

test('app shell renders with the default theme', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Subscriptions')
  await expect(page.locator('html')).toHaveAttribute('data-scheme', 'nocturne')
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark')
})

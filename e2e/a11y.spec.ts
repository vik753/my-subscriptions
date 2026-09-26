import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// WCAG A/AA checks on every screen, light and dark, with Google faked (see core-flow.spec.ts).
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-24T10:02:00'))
  await page.route('https://www.googleapis.com/oauth2/v3/userinfo', (route) =>
    route.fulfill({ json: { email: 'me@gmail.com', name: 'Me' } }),
  )
  await page.route(/https:\/\/www\.googleapis\.com\/(upload\/)?(calendar|drive)\/v3\/.*/, (route) =>
    route.fulfill({ json: route.request().method() === 'GET' ? { files: [] } : { id: 'x' } }),
  )
  await page.addInitScript(() => {
    sessionStorage.setItem(
      'auth.token',
      JSON.stringify({ accessToken: 'test', expiresAt: Date.now() + 3_600_000 }),
    )
  })
})

const audit = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    // Days of the neighbouring months are dimmed by design (they repeat the next/previous month).
    .exclude('[class*="_outside_"]')
    .analyze()
  expect(
    violations.map(
      (v) =>
        `${v.id}: ${v.nodes.map((n) => `${n.target.join(' ')} (${n.any[0]?.message ?? ''})`).join(' | ')}`,
    ),
  ).toEqual([])
}

const createGym = async (page: Page) => {
  await page.getByRole('button', { name: 'Add hobby' }).click()
  await page.getByLabel('Name').fill('Gym')
  await page.getByRole('button', { name: 'Mo', exact: true }).click()
  await page.getByLabel('Monday', { exact: true }).fill('10:00')
  await page.getByLabel('First session').fill('2026-09-14')
  await page.getByLabel('Sessions in pass').fill('8')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Gym' })).toBeVisible()
}

for (const mode of ['dark', 'light'] as const) {
  test(`screens pass axe (${mode})`, async ({ page }) => {
    await page.goto('./')
    if (mode === 'light') {
      await page.getByRole('button', { name: 'Settings' }).click()
      await page.getByRole('button', { name: 'Light' }).click()
      await page.goto('./')
    }
    await audit(page) // Home, empty
    await page.getByRole('button', { name: 'Add hobby' }).click()
    await audit(page) // Create form
    await page.goto('./')
    await createGym(page)
    await audit(page) // Detail
    await page.getByRole('button', { name: 'Add payment' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await audit(page) // Payment sheet
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Subscriptions' }).click()
    await audit(page) // Home list
    await page.getByRole('button', { name: 'All sessions' }).click()
    await audit(page) // All sessions
    await page.goto('./settings')
    await audit(page)
    await page.goto('./about')
    await audit(page)
  })
}

import { expect, test } from '@playwright/test'

test.describe('language from the browser locale', () => {
  test.use({ locale: 'uk-UA' })

  test('Ukrainian browser gets the Ukrainian UI', async ({ page }) => {
    await page.goto('./')
    await expect(page.locator('html')).toHaveAttribute('lang', 'uk')
    await expect(page.getByText('Облік абонементів і оплачених занять')).toBeVisible()
  })
})

test('settings survive a reload (IndexedDB)', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false')
  // No settings UI yet (stage 10): write through the same IndexedDB document the app uses.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('my-subscriptions', 1)
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const tx = open.result.transaction('state', 'readwrite')
          const store = tx.objectStore('state')
          const get = store.get('app')
          get.onsuccess = () => {
            const state = get.result ?? { schemaVersion: 1, hobbies: [], deletedHobbies: {} }
            store.put(
              { ...state, settings: { ...state.settings, scheme: 'clay', mode: 'light' } },
              'app',
            )
          }
          tx.oncomplete = () => resolve()
        }
      }),
  )
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-scheme', 'clay')
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'light')
})

// Captures the README screenshots from a running preview build with Google faked.
/* global process, sessionStorage -- Node script; sessionStorage is used inside page init code */
// Run: BASE_PATH=/ npm run build && npx vite preview --port 4173 & node scripts/capture-screenshots.mjs
import { chromium, devices } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'
const OUT = 'docs/screenshots'
// iPhone user agent: the install card shows the iOS "Share → Add to Home Screen" hint.
const phone = {
  userAgent: devices['iPhone 14'].userAgent,
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  serviceWorkers: 'block',
}

const browser = await chromium.launch()

const fakeGoogle = async (context) => {
  await context.route('https://www.googleapis.com/oauth2/v3/userinfo', (route) =>
    route.fulfill({ json: { email: 'olena@gmail.com', name: 'Olena K' } }),
  )
  await context.route(
    /https:\/\/www\.googleapis\.com\/(upload\/)?(calendar|drive)\/v3\/.*/,
    (route) =>
      route.fulfill({ json: route.request().method() === 'GET' ? { files: [] } : { id: 'x' } }),
  )
  await context.addInitScript(() =>
    sessionStorage.setItem(
      'auth.token',
      JSON.stringify({ accessToken: 't', expiresAt: Date.now() + 3_600_000 }),
    ),
  )
}

const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` })

const context = await browser.newContext(phone)
await fakeGoogle(context)
const page = await context.newPage()
await page.clock.setFixedTime(new Date('2026-09-24T10:02:00'))
await page.goto(BASE)

const create = async ({ name, days, start, sessions, price, calendar, shot: formShot }) => {
  await page.getByRole('button', { name: 'New hobby' }).click()
  await page.getByLabel('Name').fill(name)
  for (const [short, full, time, dur] of days) {
    await page.getByRole('button', { name: short, exact: true }).click()
    await page.getByLabel(full, { exact: true }).fill(time)
    await page.getByRole('textbox', { name: `${full}, min` }).fill(String(dur))
  }
  await page.getByLabel('First session').fill(start)
  await page.getByLabel('Sessions in pass').fill(String(sessions))
  await page.getByLabel('Pass price').fill(String(price))
  if (calendar) {
    await page.getByRole('switch', { name: /Add to Google Calendar/ }).click()
    await page.getByRole('switch', { name: /Back up to Google Drive/ }).click()
  }
  if (formShot) {
    await page.getByRole('switch', { name: /Back up to Google Drive/ }).scrollIntoViewIfNeeded()
    await shot(page, formShot)
  }
  await page
    .getByRole('button', { name: calendar ? 'Create and add to calendar' : 'Create', exact: true })
    .click()
  await page.getByRole('heading', { name }).waitFor()
  // In-app back: a reload would run the open check and cover the screen with a sheet.
  await page.getByRole('button', { name: 'Subscriptions' }).click()
}

await create({
  name: 'Gym',
  days: [
    ['Mo', 'Monday', '10:00', 60],
    ['Th', 'Thursday', '18:00', 90],
  ],
  start: '2026-09-07',
  sessions: 10,
  price: 8000,
  calendar: true,
  shot: 'form',
})
await create({
  name: 'English lessons',
  days: [['Tu', 'Tuesday', '19:00', 90]],
  start: '2026-09-08',
  sessions: 8,
  price: 6400,
  calendar: false,
})

// Reopening the app asks about past sessions.
await page.reload()
const sheet = page.getByRole('dialog', { name: 'Mark past sessions' })
await sheet.waitFor()
await page.waitForTimeout(400)
await shot(page, 'mark-past')
await sheet.getByRole('button', { name: 'Mark all as attended' }).click()
await sheet.getByRole('button', { name: /Sep 21, 10:00: Didn’t happen/ }).click()
await sheet.getByRole('button', { name: 'Save' }).click()
await sheet.waitFor({ state: 'hidden' })
await page.waitForTimeout(3500) // let the toast go

await shot(page, 'home')

await page.getByRole('button', { name: 'All sessions' }).click()
await page.getByRole('button', { name: /Tuesday, September 22/ }).click()
await shot(page, 'all-sessions')

await page.goto(BASE)
await page.getByRole('button', { name: /^Gym,/ }).click()
await page.getByRole('heading', { name: 'Gym' }).waitFor()
await shot(page, 'hobby')

await page.getByRole('button', { name: /Mon, Sep 28, 10:00/ }).click()
await page.getByRole('dialog').waitFor()
await page.waitForTimeout(400)
await shot(page, 'session')
await page.keyboard.press('Escape')
await page.waitForTimeout(400)

await page.getByRole('button', { name: 'Add payment' }).click()
await page.getByRole('dialog').waitFor()
await page.waitForTimeout(400)
await shot(page, 'payment')
await page.keyboard.press('Escape')

await page.goto(`${BASE}settings`)
await page.getByRole('button', { name: 'Light' }).click()
await page.getByRole('button', { name: /Sea/ }).click()
await page.waitForTimeout(300)
await shot(page, 'settings-light')

await browser.close()

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAppStore, useApp } from '../store/appStore'
import { createMemoryStorage } from '../store/persistence/storage'
import { UpdateBanner } from './UpdateBanner'

const sw = vi.hoisted(() => ({ needRefresh: false, update: vi.fn() }))
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [sw.needRefresh, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: sw.update,
  }),
}))

const initial = useApp.getState()
beforeEach(async () => {
  resetAppStore(initial)
  await useApp.getState().load(createMemoryStorage(), 'en')
  sw.update.mockReset()
})

describe('UpdateBanner', () => {
  it('stays hidden without an update', () => {
    sw.needRefresh = false
    render(<UpdateBanner />)
    expect(screen.queryByRole('button', { name: 'Update' })).toBeNull()
  })

  it('reloads into the new version on tap', async () => {
    sw.needRefresh = true
    render(<UpdateBanner />)
    expect(screen.getByText('A new version of the app is available')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Update' }))
    expect(sw.update).toHaveBeenCalledWith(true)
  })
})

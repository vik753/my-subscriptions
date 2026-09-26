import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAppStore, useApp } from '../../store/appStore'
import { useAuth } from '../../store/authStore'
import { useFlow } from '../../store/flowStore'
import { useInstall } from '../../store/installStore'
import { createMemoryStorage } from '../../store/persistence/storage'
import { useSync } from '../../store/syncStore'
import { useToast } from '../../store/toastStore'
import { Settings } from './Settings'

const initial = useApp.getState()

const renderSettings = () =>
  render(
    <MemoryRouter initialEntries={['/settings']}>
      <Routes>
        <Route path="/settings" element={<Settings />} />
        <Route path="/about" element={<p>about</p>} />
        <Route path="/" element={<p>home</p>} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(async () => {
  resetAppStore(initial)
  await useApp.getState().load(createMemoryStorage(), 'en')
  useFlow.setState({ sheet: null, next: null })
  useInstall.setState({ standalone: false })
  useSync.setState({ running: false, online: true, lastSync: null })
  useAuth.setState({
    status: 'signedIn',
    known: true,
    user: { email: 'me@gmail.com', name: 'Ihor Korenets' },
  })
})

describe('Settings', () => {
  it('changes theme, scheme and language', async () => {
    renderSettings()
    await userEvent.click(screen.getByRole('button', { name: 'Light' }))
    await userEvent.click(screen.getByRole('button', { name: /Sea/ }))
    await userEvent.click(screen.getByRole('button', { name: /Українська/ }))
    expect(useApp.getState().data.settings).toMatchObject({
      mode: 'light',
      scheme: 'sea',
      language: 'uk',
    })
    expect(screen.getByRole('heading', { name: 'Налаштування' })).toBeInTheDocument()
  })

  it('shows the account with initials and sync time', () => {
    useSync.setState({ lastSync: new Date().toISOString() })
    renderSettings()
    expect(screen.getByText('IK')).toBeInTheDocument()
    expect(screen.getByText('me@gmail.com')).toBeInTheDocument()
    expect(screen.getByText(/^Last sync: today, \d\d:\d\d$/)).toBeInTheDocument()
  })

  it('turns the calendar reminder on at 30 min and lets you pick another', async () => {
    renderSettings()
    await userEvent.click(screen.getByRole('switch', { name: 'Reminder before session' }))
    expect(useApp.getState().data.settings.reminderMinutes).toBe(30)
    await userEvent.click(screen.getByRole('button', { name: '15 min before' }))
    expect(useApp.getState().data.settings.reminderMinutes).toBe(15)
    await userEvent.click(screen.getByRole('switch', { name: 'Reminder before session' }))
    expect(useApp.getState().data.settings.reminderMinutes).toBe(0)
    expect(screen.queryByRole('button', { name: '15 min before' })).toBeNull()
  })

  it('syncs now and confirms', async () => {
    const show = vi.spyOn(useToast.getState(), 'show')
    const run = vi.spyOn(useSync.getState(), 'run').mockResolvedValue(true)
    renderSettings()
    await userEvent.click(screen.getByRole('button', { name: 'Sync now' }))
    expect(run).toHaveBeenCalled()
    expect(show).toHaveBeenCalledWith('Synced')
  })

  it('explains that sync waits while offline', async () => {
    const show = vi.spyOn(useToast.getState(), 'show')
    useSync.setState({ online: false })
    renderSettings()
    await userEvent.click(screen.getByRole('button', { name: 'Sync now' }))
    expect(show).toHaveBeenCalledWith('Offline. Changes are saved on this device')
  })

  it('signs out', async () => {
    renderSettings()
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(useAuth.getState()).toMatchObject({ status: 'signedOut', known: false })
  })

  it('offers install only when not installed, and opens About and the delete confirmation', async () => {
    renderSettings()
    await userEvent.click(screen.getByRole('button', { name: 'Install the app' }))
    expect(useFlow.getState().sheet).toEqual({ kind: 'install' })
    useFlow.setState({ sheet: null })
    await userEvent.click(screen.getByRole('button', { name: 'Delete all data' }))
    expect(useFlow.getState().sheet).toEqual({ kind: 'wipe' })
    await userEvent.click(screen.getByRole('button', { name: /About/ }))
    expect(screen.getByText('about')).toBeInTheDocument()
  })

  it('hides the install row in the installed app', () => {
    useInstall.setState({ standalone: true })
    renderSettings()
    expect(screen.queryByRole('button', { name: 'Install the app' })).toBeNull()
  })
})

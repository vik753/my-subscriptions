import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { CHANGELOG } from '../../i18n/changelog'
import { resetAppStore, useApp } from '../../store/appStore'
import { createMemoryStorage } from '../../store/persistence/storage'
import { useWhatsNew } from '../../store/whatsNewStore'
import { WhatsNewBanner } from '../WhatsNewBanner'
import { Changelog } from './Changelog'

const initial = useApp.getState()
beforeEach(async () => {
  resetAppStore(initial)
  await useApp.getState().load(createMemoryStorage(), 'en')
  localStorage.clear()
  useWhatsNew.setState({ announce: null })
})

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <WhatsNewBanner />
      <Routes>
        <Route path="/" element={<p>Home</p>} />
        <Route path="/changelog" element={<Changelog />} />
      </Routes>
    </MemoryRouter>,
  )

describe('Changelog', () => {
  it('lists every release, newest first, the current one marked', () => {
    renderAt('/changelog')
    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings).toHaveLength(CHANGELOG.length)
    expect(headings[0]).toHaveTextContent(`Version ${__APP_VERSION__}current`)
    for (const note of CHANGELOG[0]?.notes.en ?? []) expect(screen.getByText(note)).toBeVisible()
  })

  it('follows the language', async () => {
    useApp.getState().updateSettings({ language: 'uk' })
    renderAt('/changelog')
    expect(screen.getByRole('heading', { level: 1, name: 'Що нового' })).toBeInTheDocument()
    expect(screen.getByText(CHANGELOG[0]?.notes.uk[0] ?? '')).toBeInTheDocument()
  })
})

describe('WhatsNewBanner', () => {
  it('stays hidden with nothing to announce', () => {
    renderAt('/')
    expect(screen.queryByRole('button', { name: 'What’s new' })).toBeNull()
  })

  it('opens the changelog and is not shown again', async () => {
    useWhatsNew.setState({ announce: '1.3.0' })
    renderAt('/')
    expect(screen.getByText('Updated to version 1.3.0')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'What’s new' }))
    expect(screen.getByRole('heading', { level: 1, name: 'What’s new' })).toBeInTheDocument()
    expect(screen.queryByText('Updated to version 1.3.0')).toBeNull()
    expect(localStorage.getItem('ui.seenVersion')).toBe('1.3.0')
  })

  it('closes with the × button', async () => {
    useWhatsNew.setState({ announce: '1.3.0' })
    renderAt('/')
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByText('Updated to version 1.3.0')).toBeNull()
    expect(localStorage.getItem('ui.seenVersion')).toBe('1.3.0')
  })
})

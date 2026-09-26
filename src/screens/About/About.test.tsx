import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAppStore, useApp } from '../../store/appStore'
import { createMemoryStorage } from '../../store/persistence/storage'
import { syncEnv } from '../../store/syncStore'
import { useToast } from '../../store/toastStore'
import { About } from './About'

const initial = useApp.getState()

beforeEach(async () => {
  resetAppStore(initial)
  await useApp.getState().load(createMemoryStorage(), 'en')
  vi.spyOn(syncEnv, 'appUrl').mockReturnValue('https://example.test/app/')
})
afterEach(() => vi.restoreAllMocks())

const renderAbout = () =>
  render(
    <MemoryRouter>
      <About />
    </MemoryRouter>,
  )

describe('About', () => {
  it('shows version, author, license and contact links', () => {
    renderAbout()
    expect(screen.getByText(`Version ${__APP_VERSION__}`)).toBeInTheDocument()
    expect(screen.getByText('Netrebko Olena')).toBeInTheDocument()
    expect(screen.getByText('Ihor Korenets')).toBeInTheDocument()
    expect(screen.getByText('Claude (Anthropic)')).toBeInTheDocument()
    expect(screen.getByText('Proprietary')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Contact support/ })).toHaveAttribute(
      'href',
      'mailto:vik753@gmail.com',
    )
    expect(screen.getByRole('link', { name: /GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/vik753?tab=repositories',
    )
  })

  it('credits the idea author and developers in the app language', async () => {
    useApp.getState().updateSettings({ language: 'ru' })
    renderAbout()
    expect(screen.getByText('Создатель идеи')).toBeInTheDocument()
    expect(screen.getByText('Нетребко Елена')).toBeInTheDocument()
    expect(screen.getByText('Разработчики')).toBeInTheDocument()
    expect(screen.getByText('Игорь Коренец')).toBeInTheDocument()
    cleanup()
    useApp.getState().updateSettings({ language: 'uk' })
    renderAbout()
    expect(screen.getByText('Нетребко Олена')).toBeInTheDocument()
    expect(screen.getByText('Ігор Коренець')).toBeInTheDocument()
  })

  it('shares the app link with the Web Share API', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    renderAbout()
    await userEvent.click(screen.getByRole('button', { name: 'Share the app' }))
    expect(share).toHaveBeenCalledWith({
      title: 'My Subscriptions',
      url: 'https://example.test/app/',
    })
    Reflect.deleteProperty(navigator, 'share')
  })

  it('copies the link when sharing is not available', async () => {
    const show = vi.spyOn(useToast.getState(), 'show')
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderAbout()
    await userEvent.click(screen.getByRole('button', { name: 'Share the app' }))
    expect(writeText).toHaveBeenCalledWith('https://example.test/app/')
    expect(show).toHaveBeenCalledWith('App link copied')
  })
})

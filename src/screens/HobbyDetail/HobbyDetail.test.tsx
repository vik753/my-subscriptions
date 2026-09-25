import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { markSession } from '../../domain'
import { resetAppStore, useApp } from '../../store/appStore'
import { localClock } from '../../store/clock'
import { createMemoryStorage } from '../../store/persistence/storage'
import { HobbyDetail } from './HobbyDetail'

const initial = useApp.getState()

beforeEach(async () => {
  resetAppStore(initial)
  vi.spyOn(localClock, 'now').mockReturnValue('2026-09-24T10:02')
  await useApp.getState().load(createMemoryStorage(), 'en')
  useApp.getState().addHobby({
    id: 'gym',
    name: 'Gym',
    start: '2026-09-07',
    times: { 0: '10:00', 4: '18:00' },
    durs: { 0: 60, 4: 90 },
    currency: 'UAH',
    sessions: 8,
    price: 800_000,
    paymentDate: '2026-09-05',
  })
  useApp
    .getState()
    .updateHobby('gym', (h) =>
      ['2026-09-07', '2026-09-11', '2026-09-14'].reduce(
        (acc, k) => markSession(acc, k, 'attended'),
        markSession(h, '2026-09-18', 'missed'),
      ),
    )
})

const renderDetail = () =>
  render(
    <MemoryRouter initialEntries={['/hobby/gym']}>
      <Routes>
        <Route path="/" element={<p>home</p>} />
        <Route path="/hobby/:id" element={<HobbyDetail />} />
        <Route path="/hobby/:id/edit" element={<p>edit</p>} />
      </Routes>
    </MemoryRouter>,
  )

describe('HobbyDetail', () => {
  it('matches the prototype numbers for the demo Gym hobby', () => {
    renderDetail()
    expect(screen.getByRole('heading', { name: 'Gym' })).toBeInTheDocument()
    expect(
      screen.getByText('left').nextSibling ?? screen.getByText('left').parentElement,
    ).toBeTruthy()
    const stats = screen.getByText('left').closest('dl') as HTMLElement
    expect(within(stats).getByText('5')).toBeInTheDocument()
    expect(within(stats).getByText('3')).toBeInTheDocument()
    expect(within(stats).getByText('1 000 ₴')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'September 2026' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Mon, Sep 21, 10:00 — Unmarked' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /1 session needs marking/ })).toBeInTheDocument()
  })

  it('lists upcoming sessions, history newest first and payments', () => {
    renderDetail()
    const upcoming = screen.getByRole('heading', { name: 'Upcoming sessions' })
      .parentElement as HTMLElement
    const rows = within(upcoming).getAllByRole('listitem')
    expect(rows).toHaveLength(12)
    expect(rows[0]).toHaveTextContent('Fri, Sep 25')
    expect(rows[0]).toHaveTextContent('Paid')
    const history = screen.getByRole('heading', { name: 'History' }).parentElement as HTMLElement
    expect(within(history).getAllByRole('listitem')[0]).toHaveTextContent(
      'Fri, Sep 18, 18:00Cancelled · moved',
    )
    const payments = screen.getByRole('heading', { name: 'Payments' }).parentElement as HTMLElement
    expect(payments).toHaveTextContent('8 sessions')
    expect(payments).toHaveTextContent('8 000 ₴')
  })

  it('navigates between months and to edit / home', async () => {
    renderDetail()
    await userEvent.click(screen.getByRole('button', { name: 'October 2026' }))
    expect(screen.getByRole('heading', { name: 'October 2026' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByText('edit')).toBeInTheDocument()
  })
})

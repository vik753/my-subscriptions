import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAppStore, useApp } from '../../store/appStore'
import { localClock } from '../../store/clock'
import { useFlow } from '../../store/flowStore'
import { createMemoryStorage } from '../../store/persistence/storage'
import { Home } from './Home'

const initial = useApp.getState()

const renderHome = () =>
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new" element={<p>new form</p>} />
        <Route path="/hobby/:id" element={<Detail />} />
      </Routes>
    </MemoryRouter>,
  )

function Detail() {
  const { state } = useLocation()
  return <p>detail {(state as { month?: string } | null)?.month}</p>
}

beforeEach(async () => {
  resetAppStore(initial)
  vi.spyOn(localClock, 'now').mockReturnValue('2026-09-24T10:02')
  await useApp.getState().load(createMemoryStorage(), 'en')
})

describe('Home', () => {
  it('shows the empty state and opens the create form', async () => {
    renderHome()
    expect(screen.getByText('Thursday, September 24')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No passes yet' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Add hobby/ }))
    expect(screen.getByText('new form')).toBeInTheDocument()
  })

  it('shows a card per hobby with remaining sessions, pending tag and next session', async () => {
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
    renderHome()
    const card = screen.getByRole('button', { name: /Gym/ }).parentElement as HTMLElement
    // 8 paid, none marked, 5 sessions already ended → all pending, 8 still paid-left.
    expect(card).toHaveTextContent('8paid sessions left')
    expect(card).toHaveTextContent('Unmarked: 5')
    expect(card).toHaveTextContent('Next: Fri, Sep 25, 18:00')
    expect(card).toHaveTextContent('Mo 10:00 (60 min) · Fr 18:00 (90 min)')
    await userEvent.click(screen.getByRole('button', { name: 'Unmarked: 5' }))
    expect(useFlow.getState().sheet).toEqual({ kind: 'pending', hobbyId: expect.any(String) })
    await userEvent.click(screen.getByRole('button', { name: /Gym/ }))
    expect(screen.getByText(/^detail/)).toBeInTheDocument()
  })

  it('hides the tabs on the empty state', () => {
    renderHome()
    expect(screen.queryByRole('button', { name: 'All sessions' })).toBeNull()
  })

  describe('All sessions', () => {
    beforeEach(() => {
      const add = (id: string, name: string, times: Record<number, string>) =>
        useApp.getState().addHobby({
          id,
          name,
          start: '2026-09-07',
          times,
          durs: { 0: 60, 1: 90, 3: 45 },
          currency: 'UAH',
          sessions: 8,
          price: 800_000,
          paymentDate: '2026-09-05',
        })
      add('gym', 'Gym', { 0: '10:00', 3: '18:00' })
      add('eng', 'English', { 3: '09:00', 1: '19:00' })
    })

    it('shows every hobby of the selected day, sorted by time', async () => {
      renderHome()
      await userEvent.click(screen.getByRole('button', { name: 'All sessions' }))
      expect(screen.getByRole('heading', { name: 'September 2026' })).toBeInTheDocument()
      // Today (Thu, Sep 24, 10:02) is selected: English 09:00 has ended (unmarked), Gym 18:00 is ahead.
      expect(screen.getByRole('heading', { name: 'Thursday, September 24' })).toBeInTheDocument()
      const rows = screen.getAllByRole('button', { name: /· \d+ min/ })
      expect(rows.map((r) => r.textContent)).toEqual([
        'English09:00 · 45 minUnmarked',
        'Gym18:00 · 45 minPaid',
      ])
    })

    it('marks past unmarked days as pending and shows an empty day', async () => {
      renderHome()
      await userEvent.click(screen.getByRole('button', { name: 'All sessions' }))
      await userEvent.click(screen.getByRole('button', { name: 'Monday, September 21, 1 session' }))
      expect(screen.getByRole('button', { name: /Gym10:00/ })).toHaveTextContent('Unmarked')
      await userEvent.click(screen.getByRole('button', { name: 'Saturday, September 26' }))
      expect(screen.getByText('No sessions on this day')).toBeInTheDocument()
    })

    it('opens the hobby at the month of the tapped session', async () => {
      renderHome()
      await userEvent.click(screen.getByRole('button', { name: 'All sessions' }))
      await userEvent.click(screen.getByRole('button', { name: 'October 2026' }))
      await userEvent.click(screen.getByRole('button', { name: 'Thursday, October 1, 2 sessions' }))
      await userEvent.click(screen.getByRole('button', { name: /English09:00/ }))
      expect(screen.getByText('detail 2026-10')).toBeInTheDocument()
    })
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAppStore, useApp } from '../../store/appStore'
import { localClock } from '../../store/clock'
import { createMemoryStorage } from '../../store/persistence/storage'
import { Home } from './Home'

const initial = useApp.getState()

const renderHome = () =>
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new" element={<p>new form</p>} />
        <Route path="/hobby/:id" element={<p>detail</p>} />
      </Routes>
    </MemoryRouter>,
  )

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
    const card = screen.getByRole('button', { name: /Gym/ })
    // 8 paid, none marked, 5 sessions already ended → all pending, 8 still paid-left.
    expect(card).toHaveTextContent('8paid sessions left')
    expect(card).toHaveTextContent('Unmarked: 5')
    expect(card).toHaveTextContent('Next: Fri, Sep 25, 18:00')
    expect(card).toHaveTextContent('Mo 10:00 (60 min) · Fr 18:00 (90 min)')
    await userEvent.click(card)
    expect(screen.getByText('detail')).toBeInTheDocument()
  })
})

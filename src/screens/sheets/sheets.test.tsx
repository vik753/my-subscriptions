import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { markSession, summarize } from '../../domain'
import { resetAppStore, useApp } from '../../store/appStore'
import { localClock } from '../../store/clock'
import { useFlow, type FlowSheet } from '../../store/flowStore'
import { createMemoryStorage } from '../../store/persistence/storage'
import { useToast } from '../../store/toastStore'
import { SheetHost } from './SheetHost'

const initial = useApp.getState()
const NOW = '2026-09-24T10:02'

const gym = () => useApp.getState().data.hobbies.find((h) => h.id === 'gym')
const status = (key: string) => {
  const hobby = gym()
  return hobby && summarize(hobby, NOW).sessions.find((s) => s.key === key)
}
const show = (sheet: FlowSheet) => {
  act(() => useFlow.setState({ sheet, next: null }))
}

let toast: ReturnType<typeof vi.spyOn>

beforeEach(async () => {
  resetAppStore(initial)
  useFlow.setState({ sheet: null, next: null })
  vi.spyOn(localClock, 'now').mockReturnValue(NOW)
  toast = vi.spyOn(useToast.getState(), 'show')
  await useApp.getState().load(createMemoryStorage(), 'en')
  // Mondays 10:00 from Sep 7: Sep 7, 14, 21 ended; Sep 28, Oct 5 … upcoming. 4 paid.
  useApp.getState().addHobby({
    id: 'gym',
    name: 'Gym',
    start: '2026-09-07',
    times: { 0: '10:00' },
    durs: { 0: 60 },
    currency: 'UAH',
    sessions: 4,
    price: 400_000,
    paymentDate: '2026-09-05',
  })
  render(
    <MemoryRouter>
      <SheetHost />
    </MemoryRouter>,
  )
})

afterEach(() => vi.restoreAllMocks())

describe('Attendance prompt', () => {
  it('marks attended and confirms with the remaining count', async () => {
    useApp
      .getState()
      .updateHobby('gym', (h) =>
        markSession(markSession(h, '2026-09-07', 'attended'), '2026-09-14', 'attended'),
      )
    show({ kind: 'prompt', hobbyId: 'gym', key: '2026-09-21' })
    expect(screen.getByText('Gym · Mon, Sep 21, 10:00')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'I was there' }))
    expect(gym()?.marks['2026-09-21']).toBe('attended')
    expect(toast).toHaveBeenCalledWith('Marked. 1 paid session left')
    // One left → the renewal reminder follows.
    expect(useFlow.getState().next).toMatchObject({ kind: 'reminder', hobbyId: 'gym' })
    expect(useFlow.getState().sheet).toBeNull()
  })

  it('carries the payment over when the session did not happen', async () => {
    show({ kind: 'prompt', hobbyId: 'gym', key: '2026-09-21' })
    await userEvent.click(
      screen.getByRole('button', { name: 'Didn’t happen — carry payment over' }),
    )
    expect(gym()?.marks['2026-09-21']).toBe('missed')
    expect(toast).toHaveBeenCalledWith('Moved: payment now covers Mon, Oct 5, 10:00')
  })

  it('is not dismissed by Escape', async () => {
    show({ kind: 'prompt', hobbyId: 'gym', key: '2026-09-21' })
    await userEvent.keyboard('{Escape}')
    expect(useFlow.getState().sheet).not.toBeNull()
  })
})

describe('Mark past sessions', () => {
  it('saves only the chosen rows', async () => {
    show({ kind: 'pending', hobbyId: null })
    expect(screen.getByText('3 unmarked sessions')).toBeInTheDocument()
    const save = screen.getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Mon, Sep 7, 10:00: Attended' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mon, Sep 14, 10:00: Didn’t happen' }))
    // Tapping again clears a choice.
    await userEvent.click(screen.getByRole('button', { name: 'Mon, Sep 21, 10:00: Attended' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mon, Sep 21, 10:00: Attended' }))
    await userEvent.click(save)
    expect(gym()?.marks).toEqual({ '2026-09-07': 'attended', '2026-09-14': 'missed' })
    expect(toast).toHaveBeenCalledWith('Marked: 2')
  })

  it('marks all as attended', async () => {
    show({ kind: 'pending', hobbyId: null })
    await userEvent.click(screen.getByRole('button', { name: 'Mark all as attended' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(Object.values(gym()?.marks ?? {})).toEqual(['attended', 'attended', 'attended'])
  })
})

describe('Renewal reminder', () => {
  it('snoozes until tomorrow and moves to the next hobby', async () => {
    show({ kind: 'reminder', hobbyId: 'gym', queue: ['other'] })
    await userEvent.click(screen.getByRole('button', { name: 'Remind me later' }))
    expect(useApp.getState().data.settings.renewSnoozedUntil).toEqual({ gym: '2026-09-25' })
    expect(useFlow.getState().next).toEqual({ kind: 'reminder', hobbyId: 'other', queue: [] })
  })

  it('opens the payment sheet', async () => {
    show({ kind: 'reminder', hobbyId: 'gym', queue: [] })
    await userEvent.click(screen.getByRole('button', { name: 'Add payment' }))
    expect(useFlow.getState().next).toEqual({ kind: 'payment', hobbyId: 'gym', queue: [] })
  })
})

describe('Add payment', () => {
  it('repeats the last payment when fields are left empty', async () => {
    show({ kind: 'payment', hobbyId: 'gym', queue: [] })
    expect(screen.getByLabelText('Sessions')).toHaveAttribute('placeholder', '4')
    expect(screen.getByLabelText('Amount, UAH')).toHaveAttribute('placeholder', '4000')
    expect(
      screen.getByText('Covers the next 4 unpaid sessions, starting Mon, Oct 5, 10:00.'),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Paid' }))
    expect(gym()?.payments.at(-1)).toEqual({ date: '2026-09-24', n: 4, price: 400_000 })
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('4'))
  })

  it('adds a single session at the per-session price', async () => {
    show({ kind: 'payment', hobbyId: 'gym', queue: [] })
    await userEvent.click(screen.getByRole('button', { name: 'One session' }))
    expect(screen.queryByLabelText('Sessions')).toBeNull()
    await userEvent.type(screen.getByLabelText('Amount, UAH'), '950,5')
    await userEvent.click(screen.getByRole('button', { name: 'Paid' }))
    expect(gym()?.payments.at(-1)).toEqual({ date: '2026-09-24', n: 1, price: 95_050 })
  })

  it('refuses a malformed amount', async () => {
    show({ kind: 'payment', hobbyId: 'gym', queue: [] })
    await userEvent.type(screen.getByLabelText('Amount, UAH'), '1.2.3')
    await userEvent.click(screen.getByRole('button', { name: 'Paid' }))
    expect(gym()?.payments).toHaveLength(1)
  })
})

describe('Session sheet', () => {
  it('cancels a paid session and carries the payment over', async () => {
    show({ kind: 'session', hobbyId: 'gym', key: '2026-09-28' })
    expect(screen.getByRole('switch')).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel session' }))
    expect(gym()?.marks['2026-09-28']).toBe('cancelled')
    expect(toast).toHaveBeenCalledWith('Session cancelled. Payment moved to Mon, Oct 5, 10:00')
  })

  it('deducts the session when the carry-over switch is off', async () => {
    show({ kind: 'session', hobbyId: 'gym', key: '2026-09-28' })
    await userEvent.click(screen.getByRole('switch'))
    expect(screen.getByText('The session will be deducted from your pass')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel session' }))
    expect(gym()?.marks['2026-09-28']).toBe('forfeit')
    expect(toast).toHaveBeenCalledWith('Session cancelled and deducted from your pass')
  })

  it('restores a cancelled session', async () => {
    useApp.getState().updateHobby('gym', (h) => markSession(h, '2026-09-28', 'cancelled'))
    show({ kind: 'session', hobbyId: 'gym', key: '2026-09-28' })
    await userEvent.click(screen.getByRole('button', { name: 'Restore session' }))
    expect(gym()?.marks['2026-09-28']).toBeUndefined()
    expect(toast).toHaveBeenCalledWith('Session restored')
  })

  it('moves one session', async () => {
    show({ kind: 'session', hobbyId: 'gym', key: '2026-09-28' })
    await userEvent.click(screen.getByRole('button', { name: 'Move to another day' }))
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Wed, Sep 23' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Wed, Sep 30' }))
    fireEvent.change(screen.getByLabelText('New date'), { target: { value: '18:30' } })
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(status('2026-09-28')).toMatchObject({ date: '2026-09-30', time: '18:30' })
    expect(toast).toHaveBeenCalledWith('Session moved to Wed, Sep 30, 18:30')
  })

  it('moves all following sessions to the new weekday', async () => {
    show({ kind: 'session', hobbyId: 'gym', key: '2026-09-28' })
    await userEvent.click(screen.getByRole('button', { name: 'Move to another day' }))
    await userEvent.click(screen.getByRole('button', { name: 'Thu, Sep 24' }))
    await userEvent.click(screen.getByRole('switch'))
    expect(screen.getByText('Mon 10:00 → Thu 10:00')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(gym()?.sched.at(-1)).toEqual({
      from: '2026-09-24',
      times: { 3: '10:00' },
      durs: { 3: 60 },
    })
    expect(toast).toHaveBeenCalledWith('Schedule changed: Mon 10:00 → Thu 10:00')
  })
})

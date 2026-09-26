import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAppStore, useApp } from '../../store/appStore'
import { useAuth } from '../../store/authStore'
import { useFlow } from '../../store/flowStore'
import { localClock } from '../../store/clock'
import { createMemoryStorage } from '../../store/persistence/storage'
import { useToast } from '../../store/toastStore'
import { HobbyForm } from './HobbyForm'

const initial = useApp.getState()

const renderAt = (...paths: string[]) =>
  render(
    <MemoryRouter initialEntries={paths} initialIndex={paths.length - 1}>
      <Routes>
        <Route path="/" element={<p>home</p>} />
        <Route path="/new" element={<HobbyForm />} />
        <Route path="/hobby/:id/edit" element={<HobbyForm />} />
        <Route path="/hobby/:id" element={<p>detail</p>} />
      </Routes>
    </MemoryRouter>,
  )

const authInitial = useAuth.getState()

beforeEach(async () => {
  resetAppStore(initial)
  useAuth.setState(authInitial, true)
  vi.spyOn(localClock, 'now').mockReturnValue('2026-09-24T10:02')
  await useApp.getState().load(createMemoryStorage(), 'en')
})

describe('HobbyForm — create', () => {
  it('asks to pick a day first and refuses to create', async () => {
    const show = vi.spyOn(useToast.getState(), 'show')
    renderAt('/new')
    expect(screen.getByText('Pick at least one day.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(show).toHaveBeenCalledWith('Pick at least one day.')
    expect(useApp.getState().data.hobbies).toHaveLength(0)
  })

  it('creates a hobby with auto-filled first session and money in minor units', async () => {
    renderAt('/new')
    await userEvent.type(screen.getByLabelText('Name'), 'Gym')
    await userEvent.click(screen.getByRole('button', { name: 'Fr' }))
    fireEvent.change(screen.getByLabelText('Friday'), { target: { value: '18:00' } })
    await userEvent.type(screen.getByRole('textbox', { name: 'Friday, min' }), '90')
    expect(screen.getByLabelText('First session')).toHaveValue('2026-09-25')
    await userEvent.type(screen.getByLabelText('Sessions in pass'), '8')
    await userEvent.type(screen.getByLabelText('Pass price'), '8000')
    expect(
      screen.getByText(/The first 8 sessions will be marked green as paid \(1 000 ₴ each\)/),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    const [hobby] = useApp.getState().data.hobbies
    expect(hobby).toMatchObject({
      name: 'Gym',
      start: '2026-09-25',
      sched: [{ from: '2026-09-25', times: { 4: '18:00' }, durs: { 4: 90 } }],
      payments: [{ date: '2026-09-24', n: 8, price: 800_000 }],
      currency: 'UAH',
    })
    expect(screen.getByText('detail')).toBeInTheDocument()
  })

  it('stores a decimal price with a comma in minor units', async () => {
    renderAt('/new')
    await userEvent.click(screen.getByRole('button', { name: 'Fr' }))
    fireEvent.change(screen.getByLabelText('Friday'), { target: { value: '18:00' } })
    await userEvent.type(screen.getByLabelText('Sessions in pass'), '8')
    await userEvent.type(screen.getByLabelText('Pass price'), '8000,50')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(useApp.getState().data.hobbies[0]?.payments[0]?.price).toBe(800_050)
  })

  it('refuses a malformed price', async () => {
    const show = vi.spyOn(useToast.getState(), 'show')
    renderAt('/new')
    await userEvent.click(screen.getByRole('button', { name: 'Fr' }))
    fireEvent.change(screen.getByLabelText('Friday'), { target: { value: '18:00' } })
    await userEvent.type(screen.getByLabelText('Sessions in pass'), '8')
    await userEvent.type(screen.getByLabelText('Pass price'), '1.2.3')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(show).toHaveBeenCalledWith(
      'Set a time for each day, the number of sessions and the first session date.',
    )
    expect(useApp.getState().data.hobbies).toHaveLength(0)
  })

  it('copies the first day’s time and duration to all days', async () => {
    renderAt('/new')
    await userEvent.click(screen.getByRole('button', { name: 'Mo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Th' }))
    fireEvent.change(screen.getByLabelText('Monday'), { target: { value: '09:30' } })
    await userEvent.type(screen.getByRole('textbox', { name: 'Monday, min' }), '45')
    await userEvent.click(screen.getByRole('button', { name: 'Same time for all days' }))
    expect(screen.getByLabelText('Thursday')).toHaveValue('09:30')
    expect(screen.getByRole('textbox', { name: 'Thursday, min' })).toHaveValue('45')
    expect(screen.queryByRole('button', { name: 'Same time for all days' })).toBeNull()
  })

  it('keeps a new hobby on the phone by default', async () => {
    const signIn = vi.spyOn(useAuth.getState(), 'signIn').mockImplementation(() => {})
    renderAt('/new')
    expect(screen.getByRole('switch', { name: /Add to Google Calendar/ })).not.toBeChecked()
    expect(screen.getByRole('switch', { name: /Back up to Google Drive/ })).not.toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Fr' }))
    fireEvent.change(screen.getByLabelText('Friday'), { target: { value: '18:00' } })
    await userEvent.type(screen.getByLabelText('Sessions in pass'), '8')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(useApp.getState().data.hobbies[0]?.google).toMatchObject({
      calendar: false,
      backup: false,
    })
    expect(signIn).not.toHaveBeenCalled()
  })

  it('opting into Google asks to sign in after saving', async () => {
    const signIn = vi.spyOn(useAuth.getState(), 'signIn').mockImplementation(() => {})
    renderAt('/new')
    await userEvent.click(screen.getByRole('button', { name: 'Fr' }))
    fireEvent.change(screen.getByLabelText('Friday'), { target: { value: '18:00' } })
    await userEvent.type(screen.getByLabelText('Sessions in pass'), '8')
    expect(screen.getByText('You will be asked to sign in with Google')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('switch', { name: /Add to Google Calendar/ }))
    await userEvent.click(screen.getByRole('switch', { name: /Back up to Google Drive/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Create and add to calendar' }))
    expect(useApp.getState().data.hobbies[0]?.google).toMatchObject({
      calendar: true,
      backup: true,
    })
    expect(screen.getByText('detail')).toBeInTheDocument()
    expect(signIn).toHaveBeenCalledTimes(1)
  })

  it('picks the paid color and guests for the calendar', async () => {
    vi.spyOn(useAuth.getState(), 'signIn').mockImplementation(() => {})
    renderAt('/new')
    expect(screen.queryByText('Color of paid sessions')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Fr' }))
    fireEvent.change(screen.getByLabelText('Friday'), { target: { value: '18:00' } })
    await userEvent.type(screen.getByLabelText('Sessions in pass'), '8')
    await userEvent.click(screen.getByRole('switch', { name: /Add to Google Calendar/ }))

    // Color: Basil by default, like Google's green.
    await userEvent.click(screen.getByRole('button', { name: /Color of paid sessions.*Basil/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Grape' }))
    expect(
      screen.getByRole('button', { name: /Color of paid sessions.*Grape/ }),
    ).toBeInTheDocument()

    // Guests: invalid email is refused, duplicates collapse, case-insensitive.
    const guest = screen.getByLabelText(/Guests/)
    await userEvent.type(guest, 'wife{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address')
    await userEvent.clear(guest)
    await userEvent.type(guest, 'Wife@Gmail.com')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    await userEvent.type(guest, 'wife@gmail.com{Enter}')
    await userEvent.type(guest, 'son@gmail.com{Enter}')
    await userEvent.click(screen.getByRole('button', { name: 'Remove son@gmail.com' }))

    await userEvent.click(screen.getByRole('button', { name: 'Create and add to calendar' }))
    expect(useApp.getState().data.hobbies[0]?.google).toEqual({
      calendar: true,
      backup: false,
      guests: ['wife@gmail.com'],
      paidColor: '3',
    })
  })

  it('keeps a guest email typed but not added, and refuses a malformed one', async () => {
    vi.spyOn(useAuth.getState(), 'signIn').mockImplementation(() => {})
    const show = vi.spyOn(useToast.getState(), 'show')
    renderAt('/new')
    await userEvent.click(screen.getByRole('button', { name: 'Fr' }))
    fireEvent.change(screen.getByLabelText('Friday'), { target: { value: '18:00' } })
    await userEvent.type(screen.getByLabelText('Sessions in pass'), '8')
    await userEvent.click(screen.getByRole('switch', { name: /Add to Google Calendar/ }))
    await userEvent.type(screen.getByLabelText(/Guests/), 'wife@')
    await userEvent.click(screen.getByRole('button', { name: 'Create and add to calendar' }))
    expect(show).toHaveBeenCalledWith('Enter a valid email address')
    expect(useApp.getState().data.hobbies).toHaveLength(0)
    await userEvent.type(screen.getByLabelText(/Guests/), 'gmail.com')
    await userEvent.click(screen.getByRole('button', { name: 'Create and add to calendar' }))
    expect(useApp.getState().data.hobbies[0]?.google.guests).toEqual(['wife@gmail.com'])
  })

  it('does not ask a signed-in user to sign in again', async () => {
    useAuth.setState({ status: 'signedIn', user: { email: 'me@gmail.com', name: 'Me' } })
    const signIn = vi.spyOn(useAuth.getState(), 'signIn').mockImplementation(() => {})
    renderAt('/new')
    expect(screen.getByText('"My Subscriptions" calendar · me@gmail.com')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Fr' }))
    fireEvent.change(screen.getByLabelText('Friday'), { target: { value: '18:00' } })
    await userEvent.type(screen.getByLabelText('Sessions in pass'), '8')
    await userEvent.click(screen.getByRole('switch', { name: /Add to Google Calendar/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Create and add to calendar' }))
    expect(signIn).not.toHaveBeenCalled()
  })

  it('cancels back to the previous screen', async () => {
    renderAt('/', '/new')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('home')).toBeInTheDocument()
  })

  it('cancels to Home when opened by a deep link', async () => {
    renderAt('/new')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('home')).toBeInTheDocument()
  })
})

describe('HobbyForm — edit', () => {
  beforeEach(() => {
    useApp.getState().addHobby({
      id: 'gym',
      name: 'Gym',
      start: '2026-09-07',
      times: { 0: '10:00' },
      durs: { 0: 60 },
      currency: 'UAH',
      sessions: 8,
      price: 800_000,
      paymentDate: '2026-09-05',
    })
  })

  it('hides pass fields and saves a schedule change from tomorrow', async () => {
    renderAt('/hobby/gym/edit')
    expect(screen.queryByLabelText('Sessions in pass')).toBeNull()
    expect(screen.getByLabelText('Changes apply from')).toHaveValue('2026-09-25')
    await userEvent.click(screen.getByRole('button', { name: 'We' }))
    expect(screen.getByLabelText('Wednesday')).toHaveValue('10:00')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    const hobby = useApp.getState().data.hobbies[0]
    expect(hobby?.sched.at(-1)).toEqual({
      from: '2026-09-25',
      times: { 0: '10:00', 2: '10:00' },
      durs: { 0: 60, 2: 60 },
    })
    expect(hobby?.payments).toHaveLength(1)
  })

  it('refuses a schedule change from a past or empty date', async () => {
    const show = vi.spyOn(useToast.getState(), 'show')
    renderAt('/hobby/gym/edit')
    await userEvent.click(screen.getByRole('button', { name: 'We' }))
    for (const value of ['2026-09-10', '']) {
      fireEvent.change(screen.getByLabelText('Changes apply from'), { target: { value } })
      await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    }
    expect(show).toHaveBeenCalledTimes(2)
    expect(show).toHaveBeenCalledWith(
      'Set a time for each day, the number of sessions and the first session date.',
    )
    expect(useApp.getState().data.hobbies[0]?.sched).toHaveLength(1)
  })

  it('accepts a change from today', async () => {
    renderAt('/hobby/gym/edit')
    await userEvent.click(screen.getByRole('button', { name: 'We' }))
    fireEvent.change(screen.getByLabelText('Changes apply from'), {
      target: { value: '2026-09-24' },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(useApp.getState().data.hobbies[0]?.sched.at(-1)?.from).toBe('2026-09-24')
  })

  it('does not add a schedule segment when only the name changes', async () => {
    renderAt('/hobby/gym/edit')
    await userEvent.clear(screen.getByLabelText('Name'))
    await userEvent.type(screen.getByLabelText('Name'), 'Swim')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    const hobby = useApp.getState().data.hobbies[0]
    expect(hobby?.name).toBe('Swim')
    expect(hobby?.sched).toHaveLength(1)
  })

  it('edits the latest schedule, not the one in effect today', async () => {
    useApp.getState().updateHobby('gym', (h) => ({
      ...h,
      sched: [...h.sched, { from: '2026-10-05', times: { 3: '19:00' }, durs: { 3: 45 } }],
    }))
    renderAt('/hobby/gym/edit')
    expect(screen.getByLabelText('Thursday')).toHaveValue('19:00')
    expect(screen.queryByLabelText('Monday')).toBeNull()
  })

  it('changes the currency while there is a single payment', async () => {
    renderAt('/hobby/gym/edit')
    await userEvent.selectOptions(screen.getByLabelText('Currency'), 'USD')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(useApp.getState().data.hobbies[0]?.currency).toBe('USD')
  })

  it('locks the currency once there are several payments', () => {
    useApp.getState().updateHobby('gym', (h) => ({
      ...h,
      payments: [...h.payments, { date: '2026-09-20', n: 8, price: 800_000 }],
    }))
    renderAt('/hobby/gym/edit')
    expect(screen.queryByLabelText('Currency')).toBeNull()
  })

  it('returns to the Detail it came from instead of stacking another one', async () => {
    renderAt('/', '/hobby/gym', '/hobby/gym/edit')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByText('detail')).toBeInTheDocument()
  })

  it('cancels to the Detail when opened by a deep link', async () => {
    renderAt('/hobby/gym/edit')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('detail')).toBeInTheDocument()
  })

  it('does not ask to sign in again when saving a hobby whose options were already on', async () => {
    useApp.getState().updateHobby('gym', (h) => ({
      ...h,
      google: { calendar: true, backup: true, guests: [], paidColor: '10' },
    }))
    const signIn = vi.spyOn(useAuth.getState(), 'signIn').mockImplementation(() => {})
    renderAt('/hobby/gym/edit')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(signIn).not.toHaveBeenCalled()
  })

  it('turning an option on while signed out signs in and comes back to the hobby', async () => {
    const signIn = vi.spyOn(useAuth.getState(), 'signIn').mockImplementation(() => {})
    renderAt('/', '/hobby/gym', '/hobby/gym/edit')
    await userEvent.click(screen.getByRole('switch', { name: /Back up to Google Drive/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(signIn).toHaveBeenCalledWith('/hobby/gym')
  })

  it('switches the Google options of an existing hobby', async () => {
    useApp.getState().updateHobby('gym', (h) => ({
      ...h,
      google: { calendar: true, backup: true, guests: [], paidColor: '10' },
    }))
    useAuth.setState({ status: 'signedIn', user: { email: 'me@gmail.com', name: 'Me' } })
    renderAt('/hobby/gym/edit')
    const calendar = screen.getByRole('switch', { name: /Add to Google Calendar/ })
    expect(calendar).toBeChecked()
    await userEvent.click(calendar)
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(useApp.getState().data.hobbies[0]?.google).toMatchObject({
      calendar: false,
      backup: true,
    })
  })

  it('lists the payments and opens one for correction', async () => {
    renderAt('/hobby/gym/edit')
    await userEvent.click(
      screen.getByRole('button', { name: 'Edit payment: Sat, Sep 5, 8 sessions, 8 000 ₴' }),
    )
    expect(useFlow.getState().sheet).toEqual({ kind: 'editPayment', hobbyId: 'gym', index: 0 })
  })

  it('deletes only after confirmation', async () => {
    renderAt('/hobby/gym/edit')
    await userEvent.click(screen.getByRole('button', { name: 'Delete hobby' }))
    expect(useApp.getState().data.hobbies).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(useApp.getState().data.hobbies).toHaveLength(0)
    expect(screen.getByText('home')).toBeInTheDocument()
  })

  it('redirects home for an unknown hobby', () => {
    renderAt('/hobby/nope/edit')
    expect(screen.getByText('home')).toBeInTheDocument()
  })
})

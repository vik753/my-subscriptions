import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAppStore, useApp } from '../../store/appStore'
import { localClock } from '../../store/clock'
import { createMemoryStorage } from '../../store/persistence/storage'
import { useToast } from '../../store/toastStore'
import { HobbyForm } from './HobbyForm'

const initial = useApp.getState()

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<p>home</p>} />
        <Route path="/new" element={<HobbyForm />} />
        <Route path="/hobby/:id/edit" element={<HobbyForm />} />
        <Route path="/hobby/:id" element={<p>detail</p>} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(async () => {
  resetAppStore(initial)
  vi.spyOn(localClock, 'now').mockReturnValue('2026-09-24T10:02')
  await useApp.getState().load(createMemoryStorage(), 'en')
})

describe('HobbyForm — create', () => {
  it('asks to pick a day first and refuses to create', async () => {
    const show = vi.spyOn(useToast.getState(), 'show')
    renderAt('/new')
    expect(screen.getByText('Pick at least one day.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Create and add to calendar' }))
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
    await userEvent.click(screen.getByRole('button', { name: 'Create and add to calendar' }))

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

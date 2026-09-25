import { beforeEach, describe, expect, it, vi } from 'vitest'
import { markSession } from '../domain'
import { resetAppStore, useApp } from './appStore'
import { localClock } from './clock'
import { openPendingFlow, runOpenCheck, useFlow } from './flowStore'
import { createMemoryStorage } from './persistence/storage'

const initial = useApp.getState()

const add = (id: string, sessions: number) =>
  useApp.getState().addHobby({
    id,
    name: id,
    start: '2026-09-07',
    times: { 0: '10:00' },
    durs: { 0: 60 },
    currency: 'UAH',
    sessions,
    price: 100_000,
    paymentDate: '2026-09-05',
  })

// Mondays Sep 7, 14, 21 have ended by now.
const markPast = (id: string) =>
  useApp
    .getState()
    .updateHobby(id, (h) =>
      ['2026-09-07', '2026-09-14', '2026-09-21'].reduce(
        (acc, key) => markSession(acc, key, 'attended'),
        h,
      ),
    )

beforeEach(async () => {
  resetAppStore(initial)
  useFlow.setState({ sheet: null, next: null })
  vi.spyOn(localClock, 'now').mockReturnValue('2026-09-24T10:02')
  await useApp.getState().load(createMemoryStorage(), 'en')
})

describe('runOpenCheck', () => {
  it('does nothing without pending sessions or due renewals', () => {
    add('gym', 10)
    markPast('gym')
    runOpenCheck()
    expect(useFlow.getState().sheet).toBeNull()
  })

  it('opens the attendance prompt for a single pending session', () => {
    add('gym', 10)
    useApp
      .getState()
      .updateHobby('gym', (h) =>
        markSession(markSession(h, '2026-09-07', 'attended'), '2026-09-14', 'attended'),
      )
    runOpenCheck()
    expect(useFlow.getState().sheet).toEqual({ kind: 'prompt', hobbyId: 'gym', key: '2026-09-21' })
  })

  it('opens the list for two or more pending sessions', () => {
    add('gym', 10)
    runOpenCheck()
    expect(useFlow.getState().sheet).toEqual({ kind: 'pending', hobbyId: null })
  })

  it('queues renewal reminders when nothing is pending', () => {
    add('a', 4)
    add('b', 3)
    add('c', 10)
    ;['a', 'b', 'c'].forEach(markPast)
    runOpenCheck()
    expect(useFlow.getState().sheet).toEqual({ kind: 'reminder', hobbyId: 'a', queue: ['b'] })
  })

  it('skips a hobby snoozed until tomorrow', () => {
    add('a', 4)
    markPast('a')
    useApp.getState().snoozeRenewal('a', '2026-09-25')
    runOpenCheck()
    expect(useFlow.getState().sheet).toBeNull()
  })

  it('never replaces a sheet the user has open', () => {
    add('gym', 10)
    useFlow.setState({ sheet: { kind: 'payment', hobbyId: 'gym', queue: [] } })
    runOpenCheck()
    expect(useFlow.getState().sheet).toEqual({ kind: 'payment', hobbyId: 'gym', queue: [] })
  })
})

describe('flow sheets', () => {
  it('switching sheets closes the current one first', () => {
    const { open, closed } = useFlow.getState()
    open({ kind: 'payment', hobbyId: 'a', queue: [] })
    open({ kind: 'reminder', hobbyId: 'b', queue: [] })
    expect(useFlow.getState()).toMatchObject({ sheet: null, next: { kind: 'reminder' } })
    closed()
    expect(useFlow.getState()).toMatchObject({ sheet: { kind: 'reminder' }, next: null })
  })

  it('pending flow for one hobby only looks at that hobby', () => {
    add('a', 10)
    add('b', 10)
    markPast('b')
    expect(openPendingFlow('b')).toBe(false)
    expect(openPendingFlow('a')).toBe(true)
    expect(useFlow.getState().sheet).toEqual({ kind: 'pending', hobbyId: 'a' })
  })
})

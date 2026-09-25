import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOAST_MS, useToast } from './toastStore'

beforeEach(() => {
  vi.useFakeTimers()
  useToast.setState({ message: null, leaving: false })
})
afterEach(() => vi.useRealTimers())

describe('toastStore', () => {
  it('shows, animates out and hides after 3.2s', () => {
    useToast.getState().show('Synced')
    expect(useToast.getState()).toMatchObject({ message: 'Synced', leaving: false })
    vi.advanceTimersByTime(TOAST_MS - 250)
    expect(useToast.getState().leaving).toBe(true)
    vi.advanceTimersByTime(250)
    expect(useToast.getState().message).toBeNull()
  })

  it('a new toast replaces the current one and restarts the timer', () => {
    useToast.getState().show('First')
    vi.advanceTimersByTime(3000)
    useToast.getState().show('Second')
    vi.advanceTimersByTime(3000)
    expect(useToast.getState()).toMatchObject({ message: 'Second', leaving: true })
    vi.advanceTimersByTime(200)
    expect(useToast.getState().message).toBeNull()
  })
})

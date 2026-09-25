import { create } from 'zustand'

// Design: shown 3.2s total; the last 250ms is the leave animation.
export const TOAST_MS = 3200
const LEAVE_MS = 250

interface ToastState {
  message: string | null
  leaving: boolean
  show: (message: string) => void
}

let timers: number[] = []
const clearTimers = () => {
  timers.forEach((t) => window.clearTimeout(t))
  timers = []
}

/** One toast at a time; a new one replaces the current. */
export const useToast = create<ToastState>((set) => ({
  message: null,
  leaving: false,
  show: (message) => {
    clearTimers()
    set({ message, leaving: false })
    timers = [
      window.setTimeout(() => set({ leaving: true }), TOAST_MS - LEAVE_MS),
      window.setTimeout(() => set({ message: null, leaving: false }), TOAST_MS),
    ]
  },
}))

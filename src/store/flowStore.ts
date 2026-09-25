import { create } from 'zustand'
import { collectPending, renewalDue, type SessionKey } from '../domain'
import { useApp } from './appStore'
import { localClock } from './clock'
import { useToast } from './toastStore'

/** The one bottom sheet of the app flows; screens open sheets through this store. */
export type FlowSheet =
  | { kind: 'prompt'; hobbyId: string; key: SessionKey }
  | { kind: 'pending'; hobbyId: string | null }
  /** `queue`: hobbies still waiting for their reminder after this one. */
  | { kind: 'reminder'; hobbyId: string; queue: string[] }
  | { kind: 'payment'; hobbyId: string; queue: string[] }
  | { kind: 'session'; hobbyId: string; key: SessionKey }

interface FlowState {
  sheet: FlowSheet | null
  /** Opens after the current sheet finished its close animation. */
  next: FlowSheet | null
  open: (sheet: FlowSheet) => void
  close: () => void
  /** Called by the sheet host when the close animation ended. */
  closed: () => void
}

export const useFlow = create<FlowState>((set, get) => ({
  sheet: null,
  next: null,
  // Switching sheets plays the close animation first, then slides the next one up.
  open: (sheet) => (get().sheet ? set({ sheet: null, next: sheet }) : set({ sheet, next: null })),
  close: () => set({ sheet: null, next: null }),
  closed: () => {
    const { next, sheet } = get()
    if (next && !sheet) set({ sheet: next, next: null })
  },
}))

/** Pending flow: 1 session → Attendance prompt, ≥ 2 → Mark past sessions. False when none. */
export const openPendingFlow = (hobbyId: string | null = null): boolean => {
  const { hobbies } = useApp.getState().data
  const pending = collectPending(hobbies, localClock.now()).filter(
    (p) => hobbyId === null || p.hobbyId === hobbyId,
  )
  const [first] = pending
  if (!first) return false
  useFlow
    .getState()
    .open(
      pending.length === 1
        ? { kind: 'prompt', hobbyId: first.hobbyId, key: first.session.key }
        : { kind: 'pending', hobbyId },
    )
  return true
}

/** Renewal reminders, one after another. False when none is due. */
export const openRenewals = (): boolean => {
  const { hobbies, settings } = useApp.getState().data
  const [first, ...queue] = renewalDue(hobbies, settings.renewSnoozedUntil, localClock.now())
  if (!first) return false
  useFlow.getState().open({ kind: 'reminder', hobbyId: first, queue })
  return true
}

/** App open check (replaces notifications): pending sessions first, then renewals. */
export const runOpenCheck = () => {
  // Never interrupt something the user is doing.
  if (useFlow.getState().sheet || useFlow.getState().next) return
  if (!openPendingFlow()) openRenewals()
}

/** After attendance was saved: confirm with a toast, then any due renewal reminders. */
export const afterMarking = (message: string) => {
  useToast.getState().show(message)
  if (!openRenewals()) useFlow.getState().close()
}

import { useEffect, useState } from 'react'
import { useApp } from '../../store/appStore'
import { useFlow, type FlowSheet } from '../../store/flowStore'
import { useT } from '../../store/useT'
import { Sheet } from '../../ui/Sheet'
import { AddPayment } from './AddPayment'
import { AttendancePrompt } from './AttendancePrompt'
import { PendingList } from './PendingList'
import { RenewalReminder } from './RenewalReminder'
import { SessionSheet } from './SessionSheet'

// Attendance prompts and reminders need an answer; backdrop / Escape don't close them.
const DISMISSIBLE: Record<FlowSheet['kind'], boolean> = {
  prompt: false,
  pending: false,
  reminder: false,
  payment: true,
  session: true,
}

/** Renders the flow sheet; keeps the last content on screen during the close animation. */
export function SheetHost() {
  const t = useT()
  const sheet = useFlow((s) => s.sheet)
  const hobbies = useApp((s) => s.data.hobbies)
  const [shown, setShown] = useState(sheet)
  if (sheet && sheet !== shown) setShown(sheet)

  const hobby =
    shown && 'hobbyId' in shown ? hobbies.find((h) => h.id === shown.hobbyId) : undefined
  const { close, closed } = useFlow.getState()

  const content = (() => {
    if (!shown) return null
    if (shown.kind === 'pending')
      return <PendingList key={String(shown.hobbyId)} hobbyId={shown.hobbyId} />
    if (!hobby) return null
    switch (shown.kind) {
      case 'prompt':
        return <AttendancePrompt key={shown.key} hobby={hobby} sessionKey={shown.key} />
      case 'reminder':
        return <RenewalReminder key={hobby.id} hobby={hobby} queue={shown.queue} />
      case 'payment':
        return <AddPayment key={hobby.id} hobby={hobby} queue={shown.queue} />
      case 'session':
        return <SessionSheet key={shown.key} hobby={hobby} sessionKey={shown.key} />
    }
  })()

  // A sheet whose hobby is gone (deleted elsewhere) counts as closed at once, so a queued one still opens.
  const orphan = sheet !== null && content === null
  useEffect(() => {
    if (!orphan) return
    useFlow.setState({ sheet: null })
    useFlow.getState().closed()
  }, [orphan])

  const label = !shown
    ? ''
    : {
        prompt: t.promptTitle,
        pending: t.pendingTitle,
        reminder: hobby?.name ?? '',
        payment: t.payTitle,
        session: hobby?.name ?? '',
      }[shown.kind]

  return (
    <Sheet
      open={sheet !== null && content !== null}
      onClose={close}
      onClosed={() => {
        setShown(null)
        closed()
      }}
      dismissible={shown ? DISMISSIBLE[shown.kind] : true}
      label={label}
    >
      {content}
    </Sheet>
  )
}

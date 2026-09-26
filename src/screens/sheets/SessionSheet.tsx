import { ArrowCounterClockwise, CalendarDots, XCircle } from '@phosphor-icons/react'
import { useId, useState } from 'react'
import { cancelSession, restoreSession, summarize, type Hobby, type SessionKey } from '../../domain'
import { formatDate } from '../../i18n/format'
import { useApp } from '../../store/appStore'
import { localClock } from '../../store/clock'
import { useFlow } from '../../store/flowStore'
import { useToast } from '../../store/toastStore'
import { useLanguage, useT } from '../../store/useT'
import { Button } from '../../ui/Button'
import { Switch } from '../../ui/Switch'
import { StatusPill } from '../../ui/Tag'
import { MovePicker } from './MovePicker'
import styles from './sheets.module.css'

/** Tapped session: move it, cancel it (carrying the payment over or not), or restore a cancelled one. */
export function SessionSheet({ hobby, sessionKey }: { hobby: Hobby; sessionKey: SessionKey }) {
  const t = useT()
  const lang = useLanguage()
  const now = localClock.now()
  const s = summarize(hobby, now)
  const session = s.sessions.find((x) => x.key === sessionKey)
  const [moving, setMoving] = useState(false)
  const [carry, setCarry] = useState(true)
  const carryId = useId()
  if (!session) return null

  const cancelled = session.mark === 'cancelled' || session.mark === 'forfeit'
  const { updateHobby } = useApp.getState()
  const toast = useToast.getState().show
  const close = () => useFlow.getState().close()
  const at = (x: { date: string; time: string }) => `${formatDate(lang, x.date)}, ${x.time}`

  const cancel = () => {
    const wasPaid = session.status === 'paid'
    updateHobby(hobby.id, (h) => cancelSession(h, sessionKey, carry, now))
    close()
    if (wasPaid && !carry) return toast(t.tForfeit)
    const updated = useApp.getState().data.hobbies.find((h) => h.id === hobby.id) ?? hobby
    const lastPaid = summarize(updated, now)
      .sessions.filter((x) => x.status === 'paid')
      .pop()
    toast(t.tCancelled(wasPaid && lastPaid ? at(lastPaid) : ''))
  }

  const restore = () => {
    updateHobby(hobby.id, (h) => restoreSession(h, sessionKey))
    close()
    toast(t.tRestored)
  }

  return (
    <>
      <div className={styles.head}>
        <span className={styles.kicker}>{hobby.name}</span>
        <h2 className={styles.title}>{formatDate(lang, session.date)}</h2>
        <div className={styles.metaRow}>
          <span>
            {session.time} · {session.dur} {t.min}
          </span>
          {session.mark === 'forfeit' ? (
            <StatusPill status="forfeit">{t.forfeitTag}</StatusPill>
          ) : cancelled ? (
            <StatusPill status="cancelled">{t.cancelledTag}</StatusPill>
          ) : (
            <StatusPill status={session.status === 'paid' ? 'paid' : 'unpaid'}>
              {session.status === 'paid' ? t.paid : t.unpaid}
            </StatusPill>
          )}
        </div>
        {session.movedFrom && (
          <span className={styles.moved}>{t.movedFrom(at(session.movedFrom))}</span>
        )}
      </div>

      {cancelled ? (
        <>
          <Button variant="primary" block tall icon={<ArrowCounterClockwise />} onClick={restore}>
            {t.restore}
          </Button>
          <Button variant="ghost" block onClick={close}>
            {t.close}
          </Button>
        </>
      ) : moving ? (
        <MovePicker
          hobby={hobby}
          session={session}
          sessions={s.sessions}
          onBack={() => setMoving(false)}
        />
      ) : (
        <>
          <Button
            variant="secondary"
            block
            tall
            icon={<CalendarDots />}
            onClick={() => setMoving(true)}
          >
            {t.moveBtn}
          </Button>
          {session.status === 'paid' && (
            <div className={styles.switchRow}>
              <span className={styles.switchText} id={carryId}>
                {t.cxL}
                <span className={styles.switchSub}>{carry ? t.cxOn : t.cxOff}</span>
              </span>
              <Switch checked={carry} onChange={setCarry} labelledBy={carryId} />
            </div>
          )}
          <Button variant="secondary" block tall icon={<XCircle />} onClick={cancel}>
            {t.cancelBtn}
          </Button>
          <Button variant="ghost" block onClick={close}>
            {t.close}
          </Button>
        </>
      )}
    </>
  )
}

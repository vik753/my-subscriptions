import {
  ArrowBendUpRight,
  ArrowCounterClockwise,
  CalendarDots,
  MinusCircle,
  Wallet,
  XCircle,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { cancelSession, restoreSession, summarize, type Hobby, type SessionKey } from '../../domain'
import { formatDate } from '../../i18n/format'
import { useApp } from '../../store/appStore'
import { localClock } from '../../store/clock'
import { useFlow } from '../../store/flowStore'
import { useToast } from '../../store/toastStore'
import { useLanguage, useT } from '../../store/useT'
import { Button } from '../../ui/Button'
import { StatusPill } from '../../ui/Tag'
import { MovePicker } from './MovePicker'
import styles from './sheets.module.css'

/**
 * Tapped session: pay for it (when unpaid), move it, cancel it (carrying the payment over or not),
 * or restore a cancelled one.
 */
export function SessionSheet({ hobby, sessionKey }: { hobby: Hobby; sessionKey: SessionKey }) {
  const t = useT()
  const lang = useLanguage()
  const now = localClock.now()
  const s = summarize(hobby, now)
  const session = s.sessions.find((x) => x.key === sessionKey)
  const [moving, setMoving] = useState(false)
  // A paid session asks what happens to its payment before it is cancelled.
  const [asking, setAsking] = useState(false)
  if (!session) return null

  const cancelled = session.mark === 'cancelled' || session.mark === 'forfeit'
  const { updateHobby } = useApp.getState()
  const toast = useToast.getState().show
  const close = () => useFlow.getState().close()
  const at = (x: { date: string; time: string }) => `${formatDate(lang, x.date)}, ${x.time}`

  const cancel = (carry: boolean) => {
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
      ) : asking ? (
        <>
          <div className={styles.head}>
            <h3 className={styles.title}>{t.cxAsk}</h3>
            <p className={styles.body}>{t.cxAskBody}</p>
          </div>
          <Button
            variant="primary"
            block
            tall
            icon={<ArrowBendUpRight />}
            onClick={() => cancel(true)}
          >
            {t.cxYes}
          </Button>
          <Button
            variant="secondary"
            block
            tall
            icon={<MinusCircle />}
            onClick={() => cancel(false)}
          >
            {t.cxNo}
          </Button>
          <Button variant="ghost" block onClick={() => setAsking(false)}>
            {t.back}
          </Button>
        </>
      ) : (
        <>
          {session.status === 'unpaid' && (
            <Button
              variant="secondary"
              block
              tall
              icon={<Wallet />}
              onClick={() =>
                useFlow.getState().open({
                  kind: 'payment',
                  hobbyId: hobby.id,
                  queue: [],
                  from: sessionKey,
                  one: true,
                })
              }
            >
              {t.payThis}
            </Button>
          )}
          <Button
            variant="secondary"
            block
            tall
            icon={<CalendarDots />}
            onClick={() => setMoving(true)}
          >
            {t.moveBtn}
          </Button>
          <Button
            variant="secondary"
            block
            tall
            icon={<XCircle />}
            onClick={() => (session.status === 'paid' ? setAsking(true) : cancel(true))}
          >
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

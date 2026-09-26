import { ArrowBendUpRight, Check } from '@phosphor-icons/react'
import { markSession, summarize, type Hobby, type Mark, type SessionKey } from '../../domain'
import { formatDate } from '../../i18n/format'
import { useApp } from '../../store/appStore'
import { localClock } from '../../store/clock'
import { afterMarking, useFlow } from '../../store/flowStore'
import { useToast } from '../../store/toastStore'
import { useLanguage, useT } from '../../store/useT'
import { Button } from '../../ui/Button'
import styles from './sheets.module.css'

/** "Did you attend the session?" for a single pending session. */
export function AttendancePrompt({ hobby, sessionKey }: { hobby: Hobby; sessionKey: SessionKey }) {
  const t = useT()
  const lang = useLanguage()
  const session = summarize(hobby, localClock.now()).sessions.find((s) => s.key === sessionKey)

  const mark = (value: Mark) => {
    useApp.getState().updateHobby(hobby.id, (h) => markSession(h, sessionKey, value))
    const after = summarize(
      useApp.getState().data.hobbies.find((h) => h.id === hobby.id) ?? hobby,
      localClock.now(),
    )
    if (value === 'missed') {
      const lastPaid = after.sessions.filter((s) => s.status === 'paid').pop()
      useToast
        .getState()
        .show(t.tMoved(lastPaid ? `${formatDate(lang, lastPaid.date)}, ${lastPaid.time}` : '—'))
      return useFlow.getState().close()
    }
    afterMarking(t.tMarked(after.remaining))
  }

  return (
    <>
      <div className={styles.head}>
        <span className={styles.meta}>
          {hobby.name}
          {session && ` · ${formatDate(lang, session.date)}, ${session.time}`}
        </span>
        <h2 className={styles.title}>{t.promptTitle}</h2>
        <p className={styles.body}>{t.promptBody}</p>
      </div>
      <Button variant="primary" block tall icon={<Check />} onClick={() => mark('attended')}>
        {t.yes}
      </Button>
      <Button
        variant="secondary"
        block
        tall
        icon={<ArrowBendUpRight />}
        onClick={() => mark('missed')}
      >
        {t.no}
      </Button>
      <Button variant="ghost" block onClick={() => useFlow.getState().close()}>
        {t.later}
      </Button>
    </>
  )
}

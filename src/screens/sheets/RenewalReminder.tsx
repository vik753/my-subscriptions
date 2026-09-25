import { addDays, summarize, type Hobby } from '../../domain'
import { formatDate } from '../../i18n/format'
import { useApp } from '../../store/appStore'
import { localClock } from '../../store/clock'
import { useFlow } from '../../store/flowStore'
import { useLanguage, useT } from '../../store/useT'
import { Button } from '../../ui/Button'
import styles from './sheets.module.css'

/** "One paid session left" / "No paid sessions left" → add a payment or snooze until tomorrow. */
export function RenewalReminder({ hobby, queue }: { hobby: Hobby; queue: string[] }) {
  const t = useT()
  const lang = useLanguage()
  const now = localClock.now()
  const s = summarize(hobby, now)
  const lastPaid = s.sessions.find((x) => x.status === 'paid')

  const later = () => {
    useApp.getState().snoozeRenewal(hobby.id, addDays(now.slice(0, 10), 1))
    const [next, ...rest] = queue
    const flow = useFlow.getState()
    if (next) flow.open({ kind: 'reminder', hobbyId: next, queue: rest })
    else flow.close()
  }

  return (
    <>
      <div className={styles.head}>
        <span className={styles.kicker}>{hobby.name}</span>
        <h2 className={styles.title}>{s.remaining === 0 ? t.rem0 : t.rem1}</h2>
        <p className={styles.body}>
          {s.remaining === 0 || !lastPaid
            ? t.remBody0
            : t.remBody1(`${formatDate(lang, lastPaid.date)}, ${lastPaid.time}`)}
        </p>
      </div>
      <Button
        variant="primary"
        block
        tall
        onClick={() => useFlow.getState().open({ kind: 'payment', hobbyId: hobby.id, queue })}
      >
        {t.buyNew}
      </Button>
      <Button variant="ghost" block onClick={later}>
        {t.remindLater}
      </Button>
    </>
  )
}

import { Clock, ClockCountdown } from '@phosphor-icons/react'
import { segmentAt, summarize, type Hobby, type LocalDateTime } from '../../domain'
import { formatDate, formatScheduleGroups } from '../../i18n/format'
import { useLanguage, useT } from '../../store/useT'
import { Card } from '../../ui/Card'
import { Groups } from '../../ui/Groups'
import { Tag } from '../../ui/Tag'
import styles from './Home.module.css'

const MAX_PILLS = 24

export function HobbyCard({
  hobby,
  now,
  onOpen,
  onPending,
}: {
  hobby: Hobby
  now: LocalDateTime
  onOpen: () => void
  /** "Unmarked: N" tag → the pending flow of this hobby. */
  onPending: () => void
}) {
  const t = useT()
  const lang = useLanguage()
  const s = summarize(hobby, now)
  const segment = segmentAt(hobby.sched, now.slice(0, 10)) ?? hobby.sched[hobby.sched.length - 1]
  const pending = s.pending.length

  return (
    <Card onClick={onOpen} label={`${hobby.name}, ${s.remaining} ${t.remOf(s.remaining)}`}>
      <span className={styles.cardTop}>
        <span className={styles.cardHead}>
          <span className={styles.cardName}>{hobby.name}</span>
          {segment && (
            <span className={styles.schedule}>
              <Groups parts={formatScheduleGroups(lang, segment.times, segment.durs)} />
            </span>
          )}
        </span>
        <span className={styles.tags}>
          {pending > 0 && (
            <Tag icon={<ClockCountdown size={12} aria-hidden="true" />} onClick={onPending}>
              {t.tagPending(pending)}
            </Tag>
          )}
          {s.remaining <= 1 && <Tag>{t.renewSoon}</Tag>}
        </span>
      </span>
      <span className={styles.remaining}>
        <span className={styles.bigNumber}>{s.remaining}</span>
        <span className={styles.remLabel}>{t.remOf(s.remaining)}</span>
      </span>
      {s.remaining > 0 && (
        <span className={styles.pills} aria-hidden="true">
          {Array.from({ length: Math.min(s.remaining, MAX_PILLS) }, (_, i) => (
            <span key={i} className={styles.pill} />
          ))}
        </span>
      )}
      <span className={styles.next}>
        <Clock size={16} aria-hidden="true" />
        {s.next ? `${t.next}${formatDate(lang, s.next.date)}, ${s.next.time}` : t.none}
      </span>
    </Card>
  )
}

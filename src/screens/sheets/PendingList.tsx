import { Check, Checks, X } from '@phosphor-icons/react'
import { useState } from 'react'
import { collectPending, markSession, type Hobby, type PendingItem } from '../../domain'
import { formatDate } from '../../i18n/format'
import { useApp } from '../../store/appStore'
import { localClock } from '../../store/clock'
import { afterMarking, useFlow } from '../../store/flowStore'
import { useLanguage, useT } from '../../store/useT'
import { Button } from '../../ui/Button'
import styles from './sheets.module.css'

type Choice = 'attended' | 'missed'
const itemKey = (p: PendingItem) => `${p.hobbyId}|${p.session.key}`

/** "Mark past sessions": every pending session (of one hobby or all), oldest first. */
export function PendingList({ hobbyId }: { hobbyId: string | null }) {
  const t = useT()
  const lang = useLanguage()
  const hobbies = useApp((s) => s.data.hobbies)
  // Frozen when the sheet opens: rows must not vanish or reorder while the user is choosing.
  const [items] = useState(() =>
    collectPending(hobbies, localClock.now()).filter(
      (p) => hobbyId === null || p.hobbyId === hobbyId,
    ),
  )
  const [chosen, setChosen] = useState<Record<string, Choice>>({})

  const groups: { hobby: Hobby; items: PendingItem[] }[] = []
  for (const p of items) {
    const hobby = hobbies.find((h) => h.id === p.hobbyId)
    if (!hobby) continue
    const group = groups.find((g) => g.hobby.id === hobby.id)
    if (group) group.items.push(p)
    else groups.push({ hobby, items: [p] })
  }

  const toggle = (key: string, value: Choice) =>
    setChosen((c) => {
      const { [key]: current, ...rest } = c
      return current === value ? rest : { ...rest, [key]: value }
    })

  const save = () => {
    const entries = Object.entries(chosen)
    if (!entries.length) return
    const { updateHobby } = useApp.getState()
    for (const { hobby, items: rows } of groups) {
      const marks = rows.flatMap((p) => {
        const value = chosen[itemKey(p)]
        return value ? [[p.session.key, value] as const] : []
      })
      if (marks.length)
        updateHobby(hobby.id, (h) =>
          marks.reduce((acc, [key, value]) => markSession(acc, key, value), h),
        )
    }
    afterMarking(t.tMarkedN(entries.length))
  }

  return (
    <>
      <div className={styles.head}>
        <h2 className={styles.title}>{t.pendingTitle}</h2>
        <span className={styles.sub}>{t.pendingCount(items.length)}</span>
      </div>
      <Button
        variant="ghost"
        icon={<Checks />}
        className={styles.markAll}
        onClick={() => setChosen(Object.fromEntries(items.map((p) => [itemKey(p), 'attended'])))}
      >
        {t.markAll}
      </Button>
      <div className={styles.groups}>
        {groups.map(({ hobby, items: rows }) => (
          <ul key={hobby.id} className={styles.group} aria-label={hobby.name}>
            <li className={styles.groupName} aria-hidden="true">
              {hobby.name}
            </li>
            {rows.map((p) => {
              const key = itemKey(p)
              const label = formatDate(lang, p.session.date)
              return (
                <li key={key} className={styles.row}>
                  <span className={styles.rowText}>
                    {label}
                    <span className={styles.rowSub}>
                      {p.session.time} · {p.session.dur} {t.min}
                    </span>
                  </span>
                  <button
                    type="button"
                    className={`${styles.toggle} ${chosen[key] === 'attended' ? styles.wasOn : ''}`}
                    aria-pressed={chosen[key] === 'attended'}
                    aria-label={`${label}, ${p.session.time}: ${t.was}`}
                    onClick={() => toggle(key, 'attended')}
                  >
                    <Check aria-hidden="true" />
                    {t.was}
                  </button>
                  <button
                    type="button"
                    className={`${styles.toggle} ${chosen[key] === 'missed' ? styles.wasntOn : ''}`}
                    aria-pressed={chosen[key] === 'missed'}
                    aria-label={`${label}, ${p.session.time}: ${t.wasnt}`}
                    onClick={() => toggle(key, 'missed')}
                  >
                    <X aria-hidden="true" />
                    {t.wasnt}
                  </button>
                </li>
              )
            })}
          </ul>
        ))}
      </div>
      <Button variant="primary" block tall disabled={!Object.keys(chosen).length} onClick={save}>
        {t.saveBtn}
      </Button>
      <Button variant="ghost" block onClick={() => useFlow.getState().close()}>
        {t.later}
      </Button>
    </>
  )
}

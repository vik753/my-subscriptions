import { CalendarBlank, CloudSlash, Plus, Ticket, Warning } from '@phosphor-icons/react'
import { useNavigate, useSearchParams } from 'react-router'
import { formatDateLong } from '../../i18n/format'
import { useApp } from '../../store/appStore'
import { openPendingFlow } from '../../store/flowStore'
import { useSyncState } from '../../store/syncState'
import { useNow } from '../../store/clock'
import { useLanguage, useT } from '../../store/useT'
import { Button, IconButton } from '../../ui/Button'
import { Segmented } from '../../ui/Segmented'
import { AllSessions } from './AllSessions'
import { HobbyCard } from './HobbyCard'
import styles from './Home.module.css'
import { InstallCard } from './InstallCard'

export function Home() {
  const t = useT()
  const lang = useLanguage()
  const now = useNow()
  const navigate = useNavigate()
  const hobbies = useApp((s) => s.data.hobbies)
  const loadError = useApp((s) => s.loadError)
  const sync = useSyncState()
  // Tab and selected day live in the URL, so Back from a hobby returns to the same view.
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'all' && hobbies.length > 0 ? 'all' : 'list'
  const day = params.get('day') ?? now.slice(0, 10)
  const setView = (next: { tab: 'list' | 'all'; day?: string }) =>
    setParams(next.tab === 'all' ? { tab: 'all', ...(next.day && { day: next.day }) } : {}, {
      replace: true,
    })

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.date}>
            {formatDateLong(lang, now.slice(0, 10))}
            {sync === 'offline' && (
              <CloudSlash size={14} className={styles.syncIcon} role="img" aria-label={t.offline} />
            )}
            {sync === 'reauth' && (
              <Warning
                size={14}
                className={`${styles.syncIcon} ${styles.syncWarn}`}
                role="img"
                aria-label={t.reauth}
              />
            )}
          </p>
          <h1 className={styles.title}>{t.title}</h1>
        </div>
        <IconButton
          variant="primary"
          label={t.newHobby}
          icon={<Plus />}
          onClick={() => navigate('/new')}
        />
      </header>

      {loadError && (
        <p className={styles.error} role="alert">
          <Warning size={18} aria-hidden="true" />
          {t.loadErr}
        </p>
      )}

      <InstallCard />

      {hobbies.length > 0 && (
        <Segmented
          label={t.title}
          value={tab}
          onChange={(value) => setView({ tab: value })}
          options={[
            { value: 'list', label: t.tabList, icon: <Ticket /> },
            { value: 'all', label: t.tabCal, icon: <CalendarBlank /> },
          ]}
        />
      )}

      {tab === 'all' ? (
        <AllSessions
          hobbies={hobbies}
          now={now}
          day={day}
          onDay={(date) => setView({ tab: 'all', day: date })}
        />
      ) : hobbies.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <Ticket size={48} />
          </span>
          <h2 className={styles.emptyTitle}>{t.emptyTitle}</h2>
          <p className={styles.emptyBody}>{t.emptyBody}</p>
          <Button variant="primary" icon={<Plus />} onClick={() => navigate('/new')}>
            {t.addHobby}
          </Button>
        </div>
      ) : (
        <div className={styles.list}>
          {hobbies.map((h) => (
            <HobbyCard
              key={h.id}
              hobby={h}
              now={now}
              onOpen={() => navigate(`/hobby/${h.id}`)}
              onPending={() => openPendingFlow(h.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

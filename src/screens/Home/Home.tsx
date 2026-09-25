import { Plus, Ticket, Warning } from '@phosphor-icons/react'
import { useNavigate } from 'react-router'
import { formatDateLong } from '../../i18n/format'
import { useApp } from '../../store/appStore'
import { useNow } from '../../store/clock'
import { useLanguage, useT } from '../../store/useT'
import { Button, IconButton } from '../../ui/Button'
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

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.date}>{formatDateLong(lang, now.slice(0, 10))}</p>
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
          {loadError}
        </p>
      )}

      <InstallCard />

      {hobbies.length === 0 ? (
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
            <HobbyCard key={h.id} hobby={h} now={now} onOpen={() => navigate(`/hobby/${h.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}

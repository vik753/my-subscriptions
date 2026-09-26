import { CaretLeft } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { CHANGELOG } from '../../i18n/changelog'
import { formatDate } from '../../i18n/format'
import { useLanguage, useT } from '../../store/useT'
import { useWhatsNew } from '../../store/whatsNewStore'
import { Button } from '../../ui/Button'
import styles from './Changelog.module.css'

/** What's new: every release, newest first (from About and the "Updated to …" note). */
export function Changelog() {
  const t = useT()
  const lang = useLanguage()
  const navigate = useNavigate()

  // Reading the list counts as having seen the update note.
  useEffect(() => useWhatsNew.getState().seen(), [])

  return (
    <div className={styles.screen}>
      <header className={styles.topBar}>
        <Button variant="ghost" icon={<CaretLeft />} onClick={() => navigate('/about')}>
          {t.about}
        </Button>
      </header>

      <h1 className={styles.title}>{t.whatsNew}</h1>

      {CHANGELOG.map((r) => (
        <section key={r.version} className={styles.release} aria-labelledby={`v${r.version}`}>
          <h2 id={`v${r.version}`} className={styles.version}>
            {t.version} {r.version}
            {r.version === __APP_VERSION__ && (
              <span className={styles.current}>{t.currentVersion}</span>
            )}
          </h2>
          <p className={styles.date}>{formatDate(lang, r.date)}</p>
          <ul className={styles.notes}>
            {r.notes[lang].map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

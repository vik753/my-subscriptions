import {
  ArrowUpRight,
  CaretLeft,
  EnvelopeSimple,
  GithubLogo,
  ShareNetwork,
} from '@phosphor-icons/react'
import { useNavigate } from 'react-router'
import { APP_NAME } from '../../i18n'
import { syncEnv } from '../../store/syncStore'
import { useToast } from '../../store/toastStore'
import { useT } from '../../store/useT'
import { Button } from '../../ui/Button'
import { ListRow, ListSection } from '../../ui/List'
import styles from './About.module.css'

const AUTHOR = 'Ihor Korenets'
const SUPPORT = 'vik753@gmail.com'
const GITHUB = 'https://github.com/vik753?tab=repositories'

export function About() {
  const t = useT()
  const navigate = useNavigate()
  const toast = useToast((s) => s.show)

  // Web Share where available (phones); otherwise copy the link.
  const share = async () => {
    const url = syncEnv.appUrl()
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: APP_NAME, url })
      } catch {
        // Cancelled by the user.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast(t.tShare)
    } catch {
      toast(url)
    }
  }

  return (
    <div className={styles.screen}>
      <header className={styles.topBar}>
        <Button variant="ghost" icon={<CaretLeft />} onClick={() => navigate('/settings')}>
          {t.settings}
        </Button>
      </header>

      <div className={styles.head}>
        <img
          className={styles.icon}
          src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
          alt=""
          width={72}
          height={72}
        />
        <h1 className={styles.title}>{APP_NAME}</h1>
        <p className={styles.version}>
          {t.version} {__APP_VERSION__}
        </p>
      </div>

      <ListSection>
        <ListRow label={t.author} trailing={<span className={styles.value}>{AUTHOR}</span>} />
        <ListRow
          label={t.licenseL}
          trailing={<span className={styles.value}>{t.proprietary}</span>}
        />
      </ListSection>

      <ListSection>
        <ListRow
          icon={<EnvelopeSimple />}
          label={t.support}
          sub={SUPPORT}
          href={`mailto:${SUPPORT}`}
          chevron
        />
        <ListRow
          icon={<GithubLogo />}
          label="GitHub"
          sub="github.com/vik753"
          href={GITHUB}
          trailing={<ArrowUpRight size={14} className={styles.external} aria-hidden="true" />}
        />
        <ListRow icon={<ShareNetwork />} label={t.share} chevron onClick={() => void share()} />
      </ListSection>

      <p className={styles.rights}>
        © {new Date().getFullYear()} {AUTHOR}. {t.rights}
      </p>
    </div>
  )
}

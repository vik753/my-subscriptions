import { useEffect, useState } from 'react'
import { CalendarCheck, GoogleDriveLogo, GoogleLogo, Ticket, Warning } from '@phosphor-icons/react'
import { APP_NAME } from '../../i18n'
import { useAuth } from '../../store/authStore'
import { useT } from '../../store/useT'
import { Button } from '../../ui/Button'
import styles from './SignIn.module.css'

export function SignIn() {
  const t = useT()
  const status = useAuth((s) => s.status)
  const signIn = useAuth((s) => s.signIn)
  // Set on tap: the page stays visible until the browser leaves for Google.
  const [redirecting, setRedirecting] = useState(false)

  // Coming back with the Back gesture restores this page from bfcache with the spinner still on.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setRedirecting(false)
    }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [])

  const features = [
    { icon: <Ticket />, text: t.feat1 },
    { icon: <CalendarCheck />, text: t.feat2 },
    { icon: <GoogleDriveLogo />, text: t.feat3 },
  ]

  return (
    <div className={styles.screen}>
      <div className={styles.top}>
        <img
          className={styles.icon}
          src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
          alt=""
          width={72}
          height={72}
        />
        <h1 className={styles.title}>{APP_NAME}</h1>
        <p className={styles.sub}>{t.signSub}</p>
        <ul className={styles.features}>
          {features.map((f) => (
            <li key={f.text} className={styles.feature}>
              <span className={styles.tile} aria-hidden="true">
                {f.icon}
              </span>
              {f.text}
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.bottom}>
        {(status === 'error' || status === 'denied') && (
          <p className={styles.alert} role="alert">
            <Warning size={18} aria-hidden="true" />
            {status === 'denied' ? t.signDenied : t.signErr}
          </p>
        )}
        <Button
          variant="primary"
          block
          tall
          icon={<GoogleLogo />}
          loading={redirecting}
          onClick={() => {
            setRedirecting(true)
            signIn()
          }}
        >
          {status === 'denied' ? t.grant : t.signIn}
        </Button>
        <p className={styles.note}>{t.signInNote}</p>
      </div>
    </div>
  )
}

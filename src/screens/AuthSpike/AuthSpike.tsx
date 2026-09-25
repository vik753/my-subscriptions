// TEMPORARY (roadmap stage 1 spike): diagnostics page for Google sign-in in the installed PWA.
// Strings are intentionally not localized — this screen is removed when the real Sign-in screen lands (stage 5).
import { useEffect, useState } from 'react'
import { useAuth } from '../../store/authStore'
import styles from './AuthSpike.module.css'

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

const minutesLeft = (expiresAt: number | null, now: number) =>
  expiresAt == null ? '—' : `${Math.max(0, Math.round((expiresAt - now) / 60_000))} min`

export function AuthSpike() {
  const {
    status,
    user,
    expiresAt,
    error,
    lastGrant,
    checks,
    signIn,
    signOut,
    forgetToken,
    runChecks,
  } = useAuth()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const rows: [string, string][] = [
    ['Status', status],
    ['Installed (standalone)', isStandalone() ? 'yes' : 'no — open from the Home Screen icon'],
    ['Account', user ? `${user.name} · ${user.email}` : '—'],
    ['Token obtained', lastGrant ?? '—'],
    ['Token expires in', minutesLeft(expiresAt, now)],
    ['Error', error ?? '—'],
  ]

  return (
    <section className={styles.panel} aria-label="Sign-in check">
      <h2 className={styles.heading}>Google sign-in check</h2>
      <dl className={styles.list}>
        {rows.map(([k, v]) => (
          <div key={k} className={styles.row}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.actions}>
        {status === 'signedIn' ? (
          <>
            <button className={styles.button} onClick={() => void runChecks()}>
              Test Calendar + Drive
            </button>
            <button className={styles.button} onClick={forgetToken}>
              Test silent re-login
            </button>
            <button className={styles.ghost} onClick={signOut}>
              Sign out
            </button>
          </>
        ) : (
          <button className={styles.button} onClick={signIn} disabled={status === 'checking'}>
            Sign in with Google
          </button>
        )}
      </div>
      {checks.length > 0 && (
        <ul className={styles.checks}>
          {checks.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

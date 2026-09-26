import {
  ArrowsClockwise,
  Bell,
  CalendarBlank,
  CaretLeft,
  DownloadSimple,
  Info,
  Moon,
  SignOut,
  Sun,
  Trash,
} from '@phosphor-icons/react'
import { useNavigate } from 'react-router'
import { APP_NAME, LANGUAGES } from '../../i18n'
import { formatDate } from '../../i18n/format'
import { useApp } from '../../store/appStore'
import { useAuth } from '../../store/authStore'
import { localClock } from '../../store/clock'
import { useFlow } from '../../store/flowStore'
import { useInstall } from '../../store/installStore'
import { useSyncState } from '../../store/syncState'
import { useSync } from '../../store/syncStore'
import { useToast } from '../../store/toastStore'
import { useLanguage, useT } from '../../store/useT'
import { Button } from '../../ui/Button'
import { ListRow, ListSection } from '../../ui/List'
import { SchemeCard } from '../../ui/SchemeCard'
import { Segmented } from '../../ui/Segmented'
import { Spinner } from '../../ui/Spinner'
import { Switch } from '../../ui/Switch'
import { SCHEMES } from '../../theme/types'
import styles from './Settings.module.css'

const NATIVE = { uk: 'Українська', en: 'English', ru: 'Русский' } as const
const REMINDERS = [15, 30, 60] as const

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

export function Settings() {
  const t = useT()
  const lang = useLanguage()
  const navigate = useNavigate()
  const settings = useApp((s) => s.data.settings)
  const update = useApp((s) => s.updateSettings)
  const user = useAuth((s) => s.user)
  const { signIn, signOut } = useAuth.getState()
  const sync = useSyncState()
  const lastSync = useSync((s) => s.lastSync)
  const standalone = useInstall((s) => s.standalone)
  const open = useFlow((s) => s.open)
  const toast = useToast((s) => s.show)

  const lastSyncLabel = (() => {
    if (!lastSync) return t.neverSynced
    const d = new Date(lastSync)
    const pad = (n: number) => String(n).padStart(2, '0')
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
    return date === localClock.now().slice(0, 10)
      ? t.lastSync(time)
      : t.lastSyncOn(`${formatDate(lang, date)}, ${time}`)
  })()

  const syncNow = async () => {
    if (sync === 'reauth') return signIn()
    if (sync === 'offline') return toast(t.tOffline)
    if (await useSync.getState().run()) toast(t.tSynced)
  }

  return (
    <div className={styles.screen}>
      <header className={styles.topBar}>
        <Button variant="ghost" icon={<CaretLeft />} onClick={() => navigate('/')}>
          {t.title}
        </Button>
      </header>
      <h1 className={styles.title}>{t.settings}</h1>

      <section className={styles.block}>
        <h2 className={styles.label}>{t.themeL}</h2>
        <Segmented
          label={t.themeL}
          value={settings.mode}
          onChange={(mode) => update({ mode })}
          options={[
            { value: 'light', label: t.light, icon: <Sun /> },
            { value: 'dark', label: t.dark, icon: <Moon /> },
          ]}
        />
      </section>

      <section className={styles.block}>
        <h2 className={styles.label}>{t.schemeL}</h2>
        <div className={styles.schemes} role="group" aria-label={t.schemeL}>
          {SCHEMES.map((scheme) => (
            <SchemeCard
              key={scheme}
              scheme={scheme}
              mode={settings.mode}
              label={t.schemeNames[scheme]}
              selected={settings.scheme === scheme}
              onSelect={() => update({ scheme })}
            />
          ))}
        </div>
      </section>

      <ListSection title={t.language}>
        {LANGUAGES.map((l) => (
          <ListRow
            key={l}
            label={NATIVE[l]}
            sub={t.langSub[l]}
            selected={settings.language === l}
            onClick={() => update({ language: l })}
          />
        ))}
      </ListSection>

      <ListSection title={t.account}>
        {user && (
          <div className={styles.account}>
            <span className={styles.avatar} aria-hidden="true">
              {initials(user.name || user.email)}
            </span>
            <span className={styles.accountText}>
              <span className={styles.accountName}>{user.name}</span>
              <span className={styles.accountEmail}>{user.email}</span>
              <span className={styles.accountSync}>{lastSyncLabel}</span>
            </span>
          </div>
        )}
        <ListRow
          icon={sync === 'syncing' ? <Spinner /> : <ArrowsClockwise />}
          label={sync === 'reauth' ? t.reauthBtn : t.syncNow}
          sub={sync === 'reauth' ? t.reauth : undefined}
          onClick={() => void syncNow()}
        />
        <ListRow icon={<SignOut />} label={t.signOut} onClick={signOut} />
      </ListSection>

      <ListSection title={t.calendarSection}>
        <ListRow
          icon={<CalendarBlank />}
          label={t.calRow}
          trailing={<span className={styles.value}>{APP_NAME}</span>}
        />
        <div className={styles.reminder}>
          <ListRow
            icon={<Bell />}
            label={t.reminderL}
            sub={t.reminderSub}
            trailing={
              <Switch
                checked={settings.reminderMinutes > 0}
                onChange={(on) => update({ reminderMinutes: on ? 30 : 0 })}
                label={t.reminderL}
              />
            }
          />
          {settings.reminderMinutes > 0 && (
            <div className={styles.minutes}>
              <Segmented
                label={t.reminderL}
                value={String(settings.reminderMinutes)}
                onChange={(v) => update({ reminderMinutes: Number(v) as 15 | 30 | 60 })}
                options={REMINDERS.map((n) => ({ value: String(n), label: t.minBefore(n) }))}
              />
            </div>
          )}
        </div>
      </ListSection>

      {!standalone && (
        <ListSection>
          <ListRow
            icon={<DownloadSimple />}
            label={t.installRow}
            chevron
            onClick={() => open({ kind: 'install' })}
          />
        </ListSection>
      )}

      <ListSection>
        <ListRow
          icon={<Info />}
          label={t.about}
          trailing={<span className={styles.version}>{__APP_VERSION__}</span>}
          chevron
          onClick={() => navigate('/about')}
        />
      </ListSection>

      <Button
        variant="ghost"
        icon={<Trash />}
        className={styles.wipe}
        onClick={() => open({ kind: 'wipe' })}
      >
        {t.wipe}
      </Button>
    </div>
  )
}

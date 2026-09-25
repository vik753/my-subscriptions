// DEV ONLY (roadmap stage 4): every UI kit component in its states, for `ui-verifier`.
// Opened with `#kit` on the dev server; not included in production builds. Sample data is not localized.
import {
  Bell,
  CalendarBlank,
  ClockCountdown,
  Cloud,
  GearSix,
  GoogleDriveLogo,
  Moon,
  Plus,
  Sun,
  Ticket,
  Trash,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { useApp } from '../../store/appStore'
import { useToast } from '../../store/toastStore'
import { useT } from '../../store/useT'
import { Button, IconButton } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { DayChips } from '../../ui/DayChips'
import { DurationField } from '../../ui/DurationField'
import { Field, SelectInput, TextInput } from '../../ui/Field'
import { ListRow, ListSection } from '../../ui/List'
import {
  DotDayCell,
  MonthCalendar,
  PickDayCell,
  SessionDayCell,
  type SessionCellStatus,
} from '../../ui/MonthCalendar'
import { Segmented } from '../../ui/Segmented'
import { Sheet } from '../../ui/Sheet'
import { Switch } from '../../ui/Switch'
import { SyncStatus } from '../../ui/SyncStatus'
import { StatusPill, Tag } from '../../ui/Tag'
import { ToastRegion } from '../../ui/Toast'
import styles from './Kit.module.css'

const SESSION_DAYS: Record<string, { time: string; status: SessionCellStatus }> = {
  '2026-09-07': { time: '10:00', status: 'attended' },
  '2026-09-11': { time: '18:00', status: 'attended' },
  '2026-09-14': { time: '10:00', status: 'attended' },
  '2026-09-18': { time: '18:00', status: 'missed' },
  '2026-09-21': { time: '10:00', status: 'pending' },
  '2026-09-25': { time: '18:00', status: 'paid' },
  '2026-09-28': { time: '10:00', status: 'paid' },
  '2026-10-02': { time: '18:00', status: 'unpaid' },
}

export function Kit() {
  const t = useT()
  const settings = useApp((s) => s.data.settings)
  const update = useApp((s) => s.updateSettings)
  const toast = useToast()
  const [sheet, setSheet] = useState(false)
  const [on, setOn] = useState(true)
  const [days, setDays] = useState(new Set([0, 4]))
  const [dur, setDur] = useState<number | null>(60)
  const [picked, setPicked] = useState('2026-09-28')

  return (
    <div className={styles.kit}>
      <h1 className={styles.h1}>UI kit</h1>

      <Section title="Theme">
        <Segmented
          label={t.themeL}
          value={settings.mode}
          onChange={(mode) => update({ mode })}
          options={[
            { value: 'light', label: t.light, icon: <Sun /> },
            { value: 'dark', label: t.dark, icon: <Moon /> },
          ]}
        />
        <Segmented
          label={t.schemeL}
          value={settings.scheme}
          onChange={(scheme) => update({ scheme })}
          options={[
            { value: 'nocturne', label: 'Nocturne' },
            { value: 'sea', label: 'Sea' },
            { value: 'clay', label: 'Clay' },
            { value: 'graphite', label: 'Graphite' },
          ]}
        />
        <Segmented
          label={t.language}
          value={settings.language}
          onChange={(language) => update({ language })}
          options={[
            { value: 'uk', label: 'UK' },
            { value: 'en', label: 'EN' },
            { value: 'ru', label: 'RU' },
          ]}
        />
      </Section>

      <Section title="Buttons">
        <div className={styles.row}>
          <IconButton label={t.settings} icon={<GearSix />} />
          <IconButton label={t.addHobby} icon={<Plus />} variant="primary" />
        </div>
        <Button variant="primary" block icon={<Plus />}>
          {t.addPayment}
        </Button>
        <Button variant="secondary" block>
          {t.moveBtn}
        </Button>
        <Button variant="ghost" block>
          {t.close}
        </Button>
        <Button variant="primary" block tall loading>
          {t.signIn}
        </Button>
        <Button variant="primary" block disabled>
          {t.saveBtn}
        </Button>
        <Button variant="ghost" icon={<Trash />}>
          {t.wipe}
        </Button>
      </Section>

      <Section title="Tags & pills">
        <div className={styles.row}>
          <Tag icon={<ClockCountdown size={12} />}>{t.tagPending(2)}</Tag>
          <Tag>{t.renewSoon}</Tag>
        </div>
        <div className={styles.row}>
          <StatusPill status="paid">{t.paid}</StatusPill>
          <StatusPill status="unpaid">{t.unpaid}</StatusPill>
          <StatusPill status="attended">{t.attended}</StatusPill>
          <StatusPill status="pending">{t.legendPending}</StatusPill>
          <StatusPill status="cancelled">{t.cancelledTag}</StatusPill>
          <StatusPill status="forfeit">{t.forfeitTag}</StatusPill>
        </div>
      </Section>

      <Section title="Card">
        <Card onClick={() => toast.show(t.tSynced)} label={t.tSynced}>
          <strong className={styles.cardName}>Gym</strong>
          <span className={styles.meta}>Mo 10:00 (60 min) · Fr 18:00 (90 min)</span>
        </Card>
      </Section>

      <Section title="Sync status">
        <SyncStatus state="ok" label={t.syncedL} />
        <SyncStatus state="syncing" label={t.syncing} />
        <SyncStatus state="offline" label={t.offline} />
        <SyncStatus state="reauth" label={t.reauth} actionLabel={t.reauthBtn} onAction={() => {}} />
      </Section>

      <Section title="Form">
        <Field label={t.fName}>{(id) => <TextInput id={id} placeholder={t.fNamePh} />}</Field>
        <DayChips
          label={t.fDays}
          names={t.days}
          selected={days}
          onToggle={(d) => setDays(toggle(days, d))}
        />
        <div className={styles.row}>
          <TextInput type="time" defaultValue="10:00" aria-label="time" className={styles.time} />
          <DurationField
            value={dur}
            onChange={setDur}
            minLabel={t.min}
            label={t.min}
            presetsLabel={t.min}
          />
        </div>
        <div className={styles.priceRow}>
          <Field label={t.fPrice}>
            {(id) => <TextInput id={id} inputMode="numeric" placeholder="8000" />}
          </Field>
          <Field label="&nbsp;" className={styles.currency}>
            {(id) => (
              <SelectInput id={id} defaultValue="UAH">
                <option value="UAH">UAH</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </SelectInput>
            )}
          </Field>
        </div>
      </Section>

      <Section title="Lists">
        <ListSection title={t.language}>
          <ListRow label="Українська" sub="Ukrainian" selected={false} onClick={() => {}} />
          <ListRow label="English" sub="English" selected onClick={() => {}} />
        </ListSection>
        <ListSection title={t.account}>
          <ListRow icon={<Cloud />} label={t.syncNow} onClick={() => {}} />
          <ListRow
            icon={<Bell />}
            label={t.reminderL}
            sub={t.reminderSub}
            trailing={<Switch checked={on} onChange={setOn} label={t.reminderL} />}
          />
          <ListRow
            icon={<GoogleDriveLogo />}
            label={t.about}
            trailing={<span className={styles.meta}>1.0.0</span>}
            chevron
            onClick={() => {}}
          />
        </ListSection>
      </Section>

      <Section title="Calendars">
        <MonthCalendar
          year={2026}
          monthIndex={8}
          title="September 2026"
          weekdayNames={t.days}
          prevLabel="prev"
          nextLabel="next"
          onPrev={() => {}}
          onNext={() => {}}
          renderDay={(d) => (
            <SessionDayCell
              day={d.day}
              inMonth={d.inMonth}
              today={d.date === '2026-09-24'}
              {...SESSION_DAYS[d.date]}
              onClick={SESSION_DAYS[d.date] ? () => {} : undefined}
            />
          )}
        />
        <MonthCalendar
          year={2026}
          monthIndex={8}
          title="September 2026"
          weekdayNames={t.days}
          prevLabel="prev"
          nextLabel="next"
          onPrev={() => {}}
          onNext={() => {}}
          renderDay={(d) => {
            const s = SESSION_DAYS[d.date]
            const dot =
              s &&
              (s.status === 'missed' ? 'cancelled' : s.status === 'forfeit' ? 'attended' : s.status)
            return (
              <DotDayCell
                day={d.day}
                inMonth={d.inMonth}
                today={d.date === '2026-09-24'}
                selected={d.date === '2026-09-22'}
                {...(dot && { dot })}
                count={d.date === '2026-09-21' ? 2 : s ? 1 : 0}
                onClick={() => {}}
              />
            )
          }}
        />
        <MonthCalendar
          year={2026}
          monthIndex={8}
          title="September 2026"
          weekdayNames={t.days}
          prevLabel="prev"
          nextLabel="next"
          onPrev={() => {}}
          onNext={() => {}}
          gap={2}
          renderDay={(d) => (
            <PickDayCell
              day={d.day}
              inMonth={d.inMonth}
              today={d.date === '2026-09-24'}
              selected={d.date === picked}
              disabled={d.date < '2026-09-24'}
              hasSession={Boolean(SESSION_DAYS[d.date])}
              onClick={() => setPicked(d.date)}
            />
          )}
        />
      </Section>

      <Section title="Overlays">
        <Button variant="secondary" block icon={<CalendarBlank />} onClick={() => setSheet(true)}>
          Open sheet
        </Button>
        <Button
          variant="secondary"
          block
          icon={<Ticket />}
          onClick={() => toast.show(t.tRenewed(8))}
        >
          Show toast
        </Button>
      </Section>

      <Sheet open={sheet} onClose={() => setSheet(false)} label={t.payTitle}>
        <span className={styles.kicker}>Gym</span>
        <h2 className={styles.sheetTitle}>{t.promptTitle}</h2>
        <p className={styles.meta}>{t.promptBody}</p>
        <Button variant="primary" block>
          {t.yes}
        </Button>
        <Button variant="secondary" block>
          {t.no}
        </Button>
        <Button variant="ghost" block onClick={() => setSheet(false)}>
          {t.later}
        </Button>
      </Sheet>

      <ToastRegion message={toast.message} leaving={toast.leaving} />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section} data-kit={title}>
      <h2 className={styles.h2}>{title}</h2>
      {children}
    </section>
  )
}

const toggle = (set: Set<number>, day: number) => {
  const next = new Set(set)
  if (next.has(day)) next.delete(day)
  else next.add(day)
  return next
}

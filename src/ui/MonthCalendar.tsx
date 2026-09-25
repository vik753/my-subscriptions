import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { IconButton } from './Button'
import { monthGrid, type CalendarDay } from './calendarGrid'
import styles from './MonthCalendar.module.css'

/** Month grid with header and navigation; cells are rendered by the caller. */
export function MonthCalendar({
  year,
  monthIndex,
  title,
  weekdayNames,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
  renderDay,
  gap = 4,
}: {
  year: number
  monthIndex: number
  /** Localized "September 2026". */
  title: string
  /** Short names Mon → Sun. */
  weekdayNames: readonly string[]
  prevLabel: string
  nextLabel: string
  onPrev: () => void
  onNext: () => void
  renderDay: (day: CalendarDay) => ReactNode
  gap?: number
}) {
  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <h3 className={styles.title} aria-live="polite">
          {title}
        </h3>
        <div className={styles.nav}>
          <IconButton size="small" label={prevLabel} icon={<CaretLeft />} onClick={onPrev} />
          <IconButton size="small" label={nextLabel} icon={<CaretRight />} onClick={onNext} />
        </div>
      </div>
      <div className={styles.grid} style={{ gap }} aria-hidden="true">
        {weekdayNames.map((name) => (
          <span key={name} className={styles.weekday}>
            {name}
          </span>
        ))}
      </div>
      <div className={styles.grid} style={{ gap }}>
        {monthGrid(year, monthIndex).map((d) => (
          <div key={d.date}>{renderDay(d)}</div>
        ))}
      </div>
    </div>
  )
}

export type SessionCellStatus = 'paid' | 'unpaid' | 'attended' | 'forfeit' | 'missed' | 'pending'

/** Hobby detail cell: 44px, day number + session time, styled by status. */
export function SessionDayCell({
  day,
  inMonth,
  today,
  time,
  status,
  label,
  onClick,
}: {
  day: number
  inMonth: boolean
  today?: boolean
  time?: string
  status?: SessionCellStatus
  /** Accessible description, e.g. "Fri, Sep 25, 18:00 — Paid". */
  label?: string
  onClick?: () => void
}) {
  const cls = [styles.cell, styles.session, status && styles[status], !inMonth && styles.outside]
  const content = (
    <>
      <span className={styles.num}>{day}</span>
      {time && <span className={styles.time}>{time}</span>}
      {status === 'pending' && <span className={styles.pendingDot} />}
      {today && <span className={styles.todayDot} />}
    </>
  )
  return onClick ? (
    <button
      type="button"
      className={cls.filter(Boolean).join(' ')}
      onClick={onClick}
      aria-label={label}
    >
      {content}
    </button>
  ) : (
    <div className={cls.filter(Boolean).join(' ')}>
      {label ? <span className={styles.srOnly}>{label}</span> : null}
      <span aria-hidden={label ? true : undefined} className={styles.cellContent}>
        {content}
      </span>
    </div>
  )
}

export type DotStatus = 'paid' | 'unpaid' | 'attended' | 'pending' | 'cancelled'

/** "All sessions" cell: 48px, day number + one status dot + count when > 1. */
export function DotDayCell({
  day,
  inMonth,
  today,
  selected,
  dot,
  count = 0,
  label,
  onClick,
}: {
  day: number
  inMonth: boolean
  today?: boolean
  selected?: boolean
  dot?: DotStatus
  count?: number
  label?: string
  onClick: () => void
}) {
  const cls = [
    styles.cell,
    styles.dotCell,
    today && styles.todayBorder,
    selected && styles.selected,
    !inMonth && styles.outside,
    count > 0 && styles.hasSessions,
  ]
  return (
    <button
      type="button"
      className={cls.filter(Boolean).join(' ')}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
    >
      <span className={styles.num}>{day}</span>
      <span className={styles.dotRow}>
        {dot && <span className={`${styles.dot} ${styles[`dot_${dot}`]}`} />}
        {count > 1 && <span className={styles.count}>{count}</span>}
      </span>
    </button>
  )
}

/** Move-session picker cell: 38px circle; past days disabled; green dot = another session. */
export function PickDayCell({
  day,
  inMonth,
  today,
  selected,
  disabled,
  hasSession,
  label,
  onClick,
}: {
  day: number
  inMonth: boolean
  today?: boolean
  selected?: boolean
  disabled?: boolean
  hasSession?: boolean
  label?: string
  onClick: () => void
}) {
  const cls = [
    styles.pick,
    today && styles.pickToday,
    selected && styles.pickSelected,
    (disabled || !inMonth) && styles.pickDisabled,
  ]
  return (
    <button
      type="button"
      className={cls.filter(Boolean).join(' ')}
      disabled={disabled || !inMonth}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
    >
      {day}
      {hasSession && <span className={styles.sessionDot} />}
    </button>
  )
}

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './Sheet.module.css'

const CLOSE_MS = 210

/**
 * Bottom sheet. Slides up on open; on close it slides down and only then calls `onClosed`,
 * so callers clear their state after the animation (design "Motion").
 */
export function Sheet({
  open,
  onClose,
  onClosed,
  dismissible = true,
  label,
  children,
}: {
  open: boolean
  /** Request to close (backdrop tap / Escape when dismissible). */
  onClose: () => void
  /** Fired after the close animation. */
  onClosed?: () => void
  /** Attendance prompts are not dismissible by backdrop/Escape. */
  dismissible?: boolean
  /** Accessible name of the dialog. */
  label: string
  children: ReactNode
}) {
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)
  const panel = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef<HTMLElement | null>(null)
  const onClosedRef = useRef(onClosed)

  useEffect(() => {
    onClosedRef.current = onClosed
  })

  // Adjust state when `open` flips (React's "adjusting state on prop change" pattern).
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setMounted(true)
      setClosing(false)
    } else if (mounted) {
      setClosing(true)
    }
  }

  // Finish closing after the slide-down animation.
  useEffect(() => {
    if (!closing) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = window.setTimeout(
      () => {
        setMounted(false)
        setClosing(false)
        restoreFocus.current?.focus()
        onClosedRef.current?.()
      },
      reduce ? 0 : CLOSE_MS,
    )
    return () => window.clearTimeout(id)
  }, [closing])

  // Move focus into the sheet when it opens; remember where to return it.
  useEffect(() => {
    if (!mounted || closing) return
    const active = document.activeElement as HTMLElement | null
    // Reopening during the close animation must keep the original opener as the restore target.
    if (!panel.current?.contains(active)) restoreFocus.current = active
    panel.current?.focus()
  }, [mounted, closing])

  // Modal behavior: the page behind neither scrolls nor is reachable by assistive tech.
  useEffect(() => {
    if (!mounted) return
    const root = document.getElementById('root')
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    root?.setAttribute('inert', '')
    return () => {
      document.body.style.overflow = overflow
      root?.removeAttribute('inert')
    }
  }, [mounted])

  if (!mounted) return null

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && dismissible) {
      e.stopPropagation()
      onClose()
    }
    if (e.key === 'Tab' && panel.current) trapFocus(e, panel.current)
  }

  return createPortal(
    <div className={styles.layer} onKeyDown={onKeyDown}>
      <div
        className={`${styles.backdrop} ${closing ? styles.backdropOut : ''}`}
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`${styles.sheet} ${closing ? styles.sheetOut : ''}`}
      >
        <div className={styles.handle} aria-hidden="true" />
        {children}
      </div>
    </div>,
    document.body,
  )
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function trapFocus(e: React.KeyboardEvent, root: HTMLElement) {
  const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
  const first = items[0]
  const last = items[items.length - 1]
  if (!first || !last) return
  const active = document.activeElement
  // Focus is on the panel itself (just opened) or somehow outside: wrap into the sheet.
  if (active === root || !root.contains(active)) {
    e.preventDefault()
    ;(e.shiftKey ? last : first).focus()
  } else if (e.shiftKey && active === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}

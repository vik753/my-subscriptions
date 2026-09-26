import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Button, IconButton } from './Button'
import { DayChips } from './DayChips'
import { DurationField } from './DurationField'
import { ListRow } from './List'
import { DotDayCell, PickDayCell, SessionDayCell } from './MonthCalendar'
import { Segmented } from './Segmented'
import { Sheet } from './Sheet'
import { Switch } from './Switch'
import { SyncStatus } from './SyncStatus'
import { Tag } from './Tag'
import { ToastRegion } from './Toast'

afterEach(() => vi.useRealTimers())

describe('Button', () => {
  it('is disabled and busy while loading', () => {
    render(<Button loading>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('icon buttons are named by their label', () => {
    render(<IconButton label="Settings" icon={<span />} />)
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
  })
})

describe('Switch', () => {
  it('toggles and reports its state', async () => {
    const onChange = vi.fn()
    render(<Switch checked={false} onChange={onChange} label="Reminder" />)
    const sw = screen.getByRole('switch', { name: 'Reminder' })
    expect(sw).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(sw)
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

describe('Segmented', () => {
  it('exposes pressed-state buttons in a named group and selects an option', async () => {
    const onChange = vi.fn()
    render(
      <Segmented
        label="Theme"
        value="dark"
        onChange={onChange}
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
      />,
    )
    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Light' }))
    expect(onChange).toHaveBeenCalledWith('light')
  })
})

describe('Tag', () => {
  it('is a button only when clickable', async () => {
    const onClick = vi.fn()
    const { rerender } = render(<Tag>Renew soon</Tag>)
    expect(screen.queryByRole('button')).toBeNull()
    rerender(<Tag onClick={onClick}>Unmarked: 2</Tag>)
    await userEvent.click(screen.getByRole('button', { name: 'Unmarked: 2' }))
    expect(onClick).toHaveBeenCalled()
  })
})

describe('DayChips', () => {
  it('marks selected days as pressed and toggles by weekday index', async () => {
    const onToggle = vi.fn()
    render(
      <DayChips
        label="Days"
        names={['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']}
        selected={new Set([0])}
        onToggle={onToggle}
      />,
    )
    expect(screen.getByRole('button', { name: 'Mo' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Fr' }))
    expect(onToggle).toHaveBeenCalledWith(4)
  })
})

describe('DurationField', () => {
  function Harness() {
    const [value, setValue] = useState<number | null>(60)
    return (
      <DurationField
        value={value}
        onChange={setValue}
        minLabel="min"
        label="Duration"
        presetsLabel="Presets"
      />
    )
  }

  it('accepts digits only (max 3)', async () => {
    render(<Harness />)
    const input = screen.getByRole('textbox', { name: 'Duration' })
    await userEvent.clear(input)
    await userEvent.type(input, '9a05x1')
    expect(input).toHaveValue('905')
    await userEvent.clear(input)
    expect(input).toHaveValue('')
  })

  it('picks a preset and closes the preset list', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Presets' }))
    await userEvent.click(screen.getByRole('button', { name: '90' }))
    expect(screen.getByRole('textbox', { name: 'Duration' })).toHaveValue('90')
    expect(screen.queryByRole('button', { name: '90' })).toBeNull()
  })
})

describe('ListRow', () => {
  it('reports its selection state as pressed', () => {
    render(<ListRow label="English" selected onClick={() => {}} />)
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders links for external rows', () => {
    render(<ListRow label="GitHub" href="https://github.com/vik753" />)
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('target', '_blank')
  })

  it('is static without an action', () => {
    render(<ListRow label="Calendar" trailing={<span>My Subscriptions</span>} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('SyncStatus', () => {
  it('offers sign-in only in the reauth state', async () => {
    const onAction = vi.fn()
    const { rerender } = render(
      <SyncStatus state="offline" label="Offline" actionLabel="Sign in" onAction={onAction} />,
    )
    expect(screen.queryByRole('button')).toBeNull()
    rerender(
      <SyncStatus state="reauth" label="Sign in again" actionLabel="Sign in" onAction={onAction} />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(onAction).toHaveBeenCalled()
  })
})

describe('calendar cells', () => {
  it('session cells are buttons only when actionable', () => {
    const { rerender } = render(<SessionDayCell day={25} inMonth time="18:00" status="paid" />)
    expect(screen.queryByRole('button')).toBeNull()
    rerender(
      <SessionDayCell
        day={25}
        inMonth
        time="18:00"
        status="paid"
        label="Fri, Sep 25"
        onClick={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: 'Fri, Sep 25' })).toBeInTheDocument()
  })

  it('dot cells show the count only for several sessions', () => {
    const { rerender } = render(
      <DotDayCell day={21} inMonth dot="paid" count={1} onClick={() => {}} />,
    )
    expect(screen.queryByText('1')).toBeNull()
    rerender(<DotDayCell day={21} inMonth dot="paid" count={2} onClick={() => {}} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('past days and days of other months cannot be picked', () => {
    const { rerender } = render(<PickDayCell day={20} inMonth disabled onClick={() => {}} />)
    expect(screen.getByRole('button', { name: '20' })).toBeDisabled()
    rerender(<PickDayCell day={2} inMonth={false} onClick={() => {}} />)
    expect(screen.getByRole('button', { name: '2' })).toBeDisabled()
  })

  it('static session cells still expose their description', () => {
    render(
      <SessionDayCell
        day={18}
        inMonth
        time="18:00"
        status="missed"
        label="Fri, Sep 18 — Cancelled"
      />,
    )
    expect(screen.getByText('Fri, Sep 18 — Cancelled')).toBeInTheDocument()
  })
})

describe('Sheet', () => {
  function Harness({
    dismissible = true,
    onClosed,
  }: {
    dismissible?: boolean
    onClosed?: () => void
  }) {
    const [open, setOpen] = useState(false)
    return (
      <>
        <button onClick={() => setOpen(true)}>Open</button>
        <Sheet
          open={open}
          onClose={() => setOpen(false)}
          onClosed={onClosed}
          dismissible={dismissible}
          label="Payment"
        >
          <button>First</button>
          <button onClick={() => setOpen(false)}>Last</button>
        </Sheet>
      </>
    )
  }

  it('opens as a modal dialog with focus inside', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    const dialog = screen.getByRole('dialog', { name: 'Payment' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveFocus()
  })

  it('closes on Escape after the slide-down, then restores focus and calls onClosed', () => {
    vi.useFakeTimers()
    const onClosed = vi.fn()
    render(<Harness onClosed={onClosed} />)
    const opener = screen.getByRole('button', { name: 'Open' })
    opener.focus()
    fireEvent.click(opener)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument() // still animating out
    act(() => vi.advanceTimersByTime(210))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onClosed).toHaveBeenCalledTimes(1)
    expect(opener).toHaveFocus()
  })

  it('ignores Escape when not dismissible', () => {
    vi.useFakeTimers()
    render(<Harness dismissible={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    act(() => vi.advanceTimersByTime(500))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes when the backdrop is tapped', () => {
    vi.useFakeTimers()
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    const backdrop = document.querySelector('[aria-hidden="true"]')
    fireEvent.click(backdrop as Element)
    act(() => vi.advanceTimersByTime(210))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('reopening during the close animation cancels the close', () => {
    vi.useFakeTimers()
    const onClosed = vi.fn()
    function Toggle() {
      const [open, setOpen] = useState(true)
      return (
        <>
          <button onClick={() => setOpen((o) => !o)}>Toggle</button>
          <Sheet open={open} onClose={() => setOpen(false)} onClosed={onClosed} label="Payment">
            <button>Inside</button>
          </Sheet>
        </>
      )
    }
    render(<Toggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Toggle', hidden: true }))
    act(() => vi.advanceTimersByTime(100))
    fireEvent.click(screen.getByRole('button', { name: 'Toggle', hidden: true }))
    act(() => vi.advanceTimersByTime(500))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(onClosed).not.toHaveBeenCalled()
  })

  it('locks page scroll and makes the app inert while open', () => {
    vi.useFakeTimers()
    const root = document.createElement('div')
    root.id = 'root'
    document.body.appendChild(root)
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(document.body.style.overflow).toBe('hidden')
    expect(root).toHaveAttribute('inert')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    act(() => vi.advanceTimersByTime(210))
    expect(document.body.style.overflow).toBe('')
    expect(root).not.toHaveAttribute('inert')
    root.remove()
  })

  it('wraps Shift+Tab from the freshly focused panel into the sheet', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveFocus()
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus()
  })

  it('keeps Tab focus inside the sheet', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    const last = screen.getByRole('button', { name: 'Last' })
    last.focus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('button', { name: 'First' }), { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()
  })
})

describe('ToastRegion', () => {
  it('keeps the live region mounted and only swaps its content', () => {
    const { rerender } = render(<ToastRegion message={null} />)
    const region = screen.getByRole('status')
    expect(region).toBeEmptyDOMElement()
    rerender(<ToastRegion message="Synced" />)
    expect(screen.getByRole('status')).toBe(region)
    expect(region).toHaveTextContent('Synced')
  })
})

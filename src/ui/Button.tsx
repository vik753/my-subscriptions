import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'
import { Spinner } from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  icon?: ReactNode
  /** Full width. */
  block?: boolean
  /** 48px instead of 44px (sign-in). */
  tall?: boolean
  /** Shows a spinner instead of the icon and disables the button. */
  loading?: boolean
}

export function Button({
  variant = 'secondary',
  icon,
  block,
  tall,
  loading,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const cls = [
    styles.button,
    styles[variant],
    block && styles.block,
    tall && styles.tall,
    className,
  ]
  return (
    <button
      type={type}
      className={cls.filter(Boolean).join(' ')}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only buttons need an accessible name. */
  label: string
  icon: ReactNode
  variant?: Exclude<ButtonVariant, 'secondary'>
  /** 44px round (headers) or 36px (calendar navigation). */
  size?: 'round' | 'small'
}

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  size = 'round',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  const cls = [styles.iconButton, styles[variant], styles[size], className].filter(Boolean)
  return (
    <button type={type} className={cls.join(' ')} aria-label={label} title={label} {...rest}>
      {icon}
    </button>
  )
}

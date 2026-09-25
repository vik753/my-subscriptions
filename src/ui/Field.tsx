import { CaretDown } from '@phosphor-icons/react'
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import styles from './Field.module.css'

/** Label (13px) above a control. Children receive the generated id via render prop. */
export function Field({
  label,
  children,
  className,
}: {
  label: string
  children: (id: string) => ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <div className={`${styles.field} ${className ?? ''}`}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children(id)}
    </div>
  )
}

/** 44px input, 16px text (16px also prevents iOS zoom on focus). */
export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${styles.input} ${className ?? ''}`} {...rest} />
}

export function SelectInput({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`${styles.selectWrap} ${className ?? ''}`}>
      <select className={`${styles.input} ${styles.select}`} {...rest}>
        {children}
      </select>
      <CaretDown size={16} className={styles.caret} aria-hidden="true" />
    </span>
  )
}

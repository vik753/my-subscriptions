import { CircleNotch } from '@phosphor-icons/react'
import styles from './Spinner.module.css'

export function Spinner({ size = 18 }: { size?: number }) {
  return <CircleNotch className={styles.spinner} size={size} aria-hidden="true" />
}

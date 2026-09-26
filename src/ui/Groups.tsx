import { Fragment } from 'react'
import styles from './Groups.module.css'

/** Text made of unbreakable groups: a line may wrap only at the separators. */
export function Groups({ parts, separator = ' · ' }: { parts: string[]; separator?: string }) {
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 && separator}
      <span className={styles.group}>{part}</span>
    </Fragment>
  ))
}

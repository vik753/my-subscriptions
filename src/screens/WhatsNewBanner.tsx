import { Sparkle, X } from '@phosphor-icons/react'
import { useNavigate } from 'react-router'
import { useT } from '../store/useT'
import { useWhatsNew } from '../store/whatsNewStore'
import { Button } from '../ui/Button'
import styles from './WhatsNewBanner.module.css'

/** "Updated to 1.3.0 — What's new": once after an update, until closed or opened. */
export function WhatsNewBanner() {
  const t = useT()
  const navigate = useNavigate()
  const announce = useWhatsNew((s) => s.announce)
  const seen = useWhatsNew((s) => s.seen)
  if (!announce) return null

  return (
    <div className={styles.banner} role="status">
      <Sparkle size={18} className={styles.icon} aria-hidden="true" />
      <span className={styles.text}>{t.updatedTo(announce)}</span>
      <Button
        variant="primary"
        onClick={() => {
          seen()
          navigate('/changelog')
        }}
      >
        {t.whatsNew}
      </Button>
      <button type="button" className={styles.close} aria-label={t.close} onClick={seen}>
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}

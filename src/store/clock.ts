import { useEffect, useState } from 'react'
import type { LocalDateTime } from '../domain'

const pad = (n: number) => String(n).padStart(2, '0')

/** Local wall-clock time as 'YYYY-MM-DDTHH:MM'. Seam for tests. */
export const localClock = {
  now: (): LocalDateTime => {
    const d = new Date()
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  },
}

/** Current local time, refreshed every minute and when the app returns to the foreground. */
export function useNow(): LocalDateTime {
  const [now, setNow] = useState(localClock.now)
  useEffect(() => {
    const tick = () => setNow(localClock.now())
    const id = window.setInterval(tick, 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return now
}

import { useAuth } from './authStore'
import { useSync } from './syncStore'

/** Same union as ui/SyncStatus (layers can't share the import). */
export type SyncState = 'ok' | 'syncing' | 'offline' | 'reauth'

/** Google session + calendar sync, as the sync status component shows it. */
export const useSyncState = (): SyncState => {
  const status = useAuth((s) => s.status)
  const running = useSync((s) => s.running)
  const online = useSync((s) => s.online)
  if (status === 'offline' || !online) return 'offline'
  if (status === 'signedIn') return running ? 'syncing' : 'ok'
  return 'reauth'
}

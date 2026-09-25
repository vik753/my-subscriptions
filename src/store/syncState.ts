import { useAuth } from './authStore'

/** Same union as ui/SyncStatus (layers can't share the import). */
export type SyncState = 'ok' | 'syncing' | 'offline' | 'reauth'

/** Until Calendar sync exists (stage 8) the status reflects the Google session only. */
export const useSyncState = (): SyncState => {
  const status = useAuth((s) => s.status)
  if (status === 'offline') return 'offline'
  if (status === 'signedIn') return 'ok'
  return 'reauth'
}

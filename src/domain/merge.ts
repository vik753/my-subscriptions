import type { Hobby } from './types'

export interface HobbySet {
  hobbies: Hobby[]
  /** hobbyId → ISO timestamp of deletion (tombstones). */
  deletedHobbies: Record<string, string>
}

/**
 * Per-hobby merge of two copies (this device and the Drive backup): the later `updatedAt` wins
 * a hobby as a whole; a deletion wins over edits made before it, an edit after it revives the hobby.
 */
export const mergeHobbies = (local: HobbySet, remote: HobbySet): HobbySet => {
  const tombstones: Record<string, string> = { ...remote.deletedHobbies }
  for (const [id, at] of Object.entries(local.deletedHobbies))
    if (!(tombstones[id] && tombstones[id] > at)) tombstones[id] = at

  const remoteById = new Map(remote.hobbies.map((h) => [h.id, h]))
  const localIds = new Set(local.hobbies.map((h) => h.id))
  const winners = [
    ...local.hobbies.map((h) => {
      const other = remoteById.get(h.id)
      return other && other.updatedAt > h.updatedAt ? other : h
    }),
    ...remote.hobbies.filter((h) => !localIds.has(h.id)),
  ]

  const hobbies: Hobby[] = []
  for (const h of winners) {
    const deletedAt = tombstones[h.id]
    if (deletedAt !== undefined && deletedAt >= h.updatedAt) continue
    hobbies.push(h)
  }
  const alive = new Set(hobbies.map((h) => h.id))
  return {
    hobbies,
    deletedHobbies: Object.fromEntries(Object.entries(tombstones).filter(([id]) => !alive.has(id))),
  }
}

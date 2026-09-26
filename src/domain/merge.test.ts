import { describe, expect, it } from 'vitest'
import { mergeHobbies } from './merge'
import type { Hobby } from './types'
import type { HobbySet } from './merge'

/** Minimal valid hobby fixture; override only what a test cares about. */
function makeHobby(overrides: Partial<Hobby> = {}): Hobby {
  return {
    id: 'h1',
    name: 'Yoga',
    start: '2026-09-24',
    sched: [{ from: '2026-09-24', times: { 3: '10:00' }, durs: { 3: 60 } }],
    payments: [],
    currency: 'UAH',
    marks: {},
    moves: {},
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeSet(hobbies: Hobby[], deletedHobbies: Record<string, string> = {}): HobbySet {
  return { hobbies, deletedHobbies }
}

describe('mergeHobbies - hobbies present on only one side', () => {
  it('keeps a hobby present only in local', () => {
    const local = makeSet([makeHobby({ id: 'h1' })])
    const remote = makeSet([])

    const result = mergeHobbies(local, remote)

    expect(result.hobbies.map((h) => h.id)).toEqual(['h1'])
  })

  it('keeps a hobby present only in remote, appended after local hobbies', () => {
    const local = makeSet([makeHobby({ id: 'h1' })])
    const remote = makeSet([makeHobby({ id: 'h2' })])

    const result = mergeHobbies(local, remote)

    expect(result.hobbies.map((h) => h.id)).toEqual(['h1', 'h2'])
  })
})

describe('mergeHobbies - conflicting hobby present on both sides', () => {
  it('picks the remote version whole when remote.updatedAt is later', () => {
    const local = makeSet([
      makeHobby({ id: 'h1', name: 'Local Yoga', updatedAt: '2026-09-01T00:00:00.000Z' }),
    ])
    const remote = makeSet([
      makeHobby({ id: 'h1', name: 'Remote Yoga', updatedAt: '2026-09-02T00:00:00.000Z' }),
    ])

    const result = mergeHobbies(local, remote)

    expect(result.hobbies).toEqual([
      makeHobby({ id: 'h1', name: 'Remote Yoga', updatedAt: '2026-09-02T00:00:00.000Z' }),
    ])
  })

  it('picks the local version whole when local.updatedAt is later', () => {
    const local = makeSet([
      makeHobby({ id: 'h1', name: 'Local Yoga', updatedAt: '2026-09-02T00:00:00.000Z' }),
    ])
    const remote = makeSet([
      makeHobby({ id: 'h1', name: 'Remote Yoga', updatedAt: '2026-09-01T00:00:00.000Z' }),
    ])

    const result = mergeHobbies(local, remote)

    expect(result.hobbies).toEqual([
      makeHobby({ id: 'h1', name: 'Local Yoga', updatedAt: '2026-09-02T00:00:00.000Z' }),
    ])
  })

  it('picks local when both sides have the same updatedAt', () => {
    const local = makeSet([
      makeHobby({ id: 'h1', name: 'Local Yoga', updatedAt: '2026-09-01T00:00:00.000Z' }),
    ])
    const remote = makeSet([
      makeHobby({ id: 'h1', name: 'Remote Yoga', updatedAt: '2026-09-01T00:00:00.000Z' }),
    ])

    const result = mergeHobbies(local, remote)

    expect(result.hobbies).toEqual([
      makeHobby({ id: 'h1', name: 'Local Yoga', updatedAt: '2026-09-01T00:00:00.000Z' }),
    ])
  })
})

describe('mergeHobbies - tombstones', () => {
  it('unions a tombstone present only in local', () => {
    const local = makeSet([], { h9: '2026-09-10T00:00:00.000Z' })
    const remote = makeSet([])

    const result = mergeHobbies(local, remote)

    expect(result.deletedHobbies).toEqual({ h9: '2026-09-10T00:00:00.000Z' })
  })

  it('unions a tombstone present only in remote', () => {
    const local = makeSet([])
    const remote = makeSet([], { h9: '2026-09-10T00:00:00.000Z' })

    const result = mergeHobbies(local, remote)

    expect(result.deletedHobbies).toEqual({ h9: '2026-09-10T00:00:00.000Z' })
  })

  it('keeps the later timestamp when both sides tombstone the same id', () => {
    const local = makeSet([], { h9: '2026-09-10T00:00:00.000Z' })
    const remote = makeSet([], { h9: '2026-09-12T00:00:00.000Z' })

    const result = mergeHobbies(local, remote)

    expect(result.deletedHobbies).toEqual({ h9: '2026-09-12T00:00:00.000Z' })
  })
})

describe('mergeHobbies - tombstone vs live hobby precedence', () => {
  it('drops a hobby whose tombstone timestamp is after its last update', () => {
    const local = makeSet([makeHobby({ id: 'h1', updatedAt: '2026-09-01T00:00:00.000Z' })])
    const remote = makeSet([], { h1: '2026-09-05T00:00:00.000Z' })

    const result = mergeHobbies(local, remote)

    expect(result.hobbies).toEqual([])
    expect(result.deletedHobbies).toEqual({ h1: '2026-09-05T00:00:00.000Z' })
  })

  it('drops a hobby whose tombstone timestamp equals its last update', () => {
    const local = makeSet([makeHobby({ id: 'h1', updatedAt: '2026-09-05T00:00:00.000Z' })])
    const remote = makeSet([], { h1: '2026-09-05T00:00:00.000Z' })

    const result = mergeHobbies(local, remote)

    expect(result.hobbies).toEqual([])
  })

  it('keeps a hobby edited after its tombstone and removes the stale tombstone from the result', () => {
    const local = makeSet([makeHobby({ id: 'h1', updatedAt: '2026-09-10T00:00:00.000Z' })])
    const remote = makeSet([], { h1: '2026-09-05T00:00:00.000Z' })

    const result = mergeHobbies(local, remote)

    expect(result.hobbies.map((h) => h.id)).toEqual(['h1'])
    expect(result.deletedHobbies).toEqual({})
  })
})

describe('mergeHobbies - result order', () => {
  it('orders local hobbies first in local order, then remote-only hobbies in remote order', () => {
    const local = makeSet([makeHobby({ id: 'h2' }), makeHobby({ id: 'h1' })])
    const remote = makeSet([
      makeHobby({ id: 'h4' }),
      makeHobby({ id: 'h3' }),
      makeHobby({ id: 'h1' }),
    ])

    const result = mergeHobbies(local, remote)

    expect(result.hobbies.map((h) => h.id)).toEqual(['h2', 'h1', 'h4', 'h3'])
  })
})

describe('mergeHobbies - purity and idempotence', () => {
  it('does not mutate the local or remote inputs', () => {
    const local = makeSet([makeHobby({ id: 'h1' })], { h9: '2026-09-10T00:00:00.000Z' })
    const remote = makeSet([makeHobby({ id: 'h2' })], { h8: '2026-09-11T00:00:00.000Z' })
    const localSnapshot = JSON.parse(JSON.stringify(local)) as HobbySet
    const remoteSnapshot = JSON.parse(JSON.stringify(remote)) as HobbySet

    mergeHobbies(local, remote)

    expect(local).toEqual(localSnapshot)
    expect(remote).toEqual(remoteSnapshot)
  })

  it('is idempotent: merging the merge result with remote again yields the same result', () => {
    const local = makeSet([
      makeHobby({ id: 'h1', name: 'Local Yoga', updatedAt: '2026-09-02T00:00:00.000Z' }),
    ])
    const remote = makeSet([
      makeHobby({ id: 'h1', name: 'Remote Yoga', updatedAt: '2026-09-01T00:00:00.000Z' }),
      makeHobby({ id: 'h2', updatedAt: '2026-09-01T00:00:00.000Z' }),
    ])

    const once = mergeHobbies(local, remote)
    const twice = mergeHobbies(once, remote)

    expect(twice).toEqual(once)
  })

  it('returns hobbies unchanged when a set is merged with itself', () => {
    const set = makeSet(
      [makeHobby({ id: 'h1' }), makeHobby({ id: 'h2', updatedAt: '2026-09-03T00:00:00.000Z' })],
      { h9: '2026-09-10T00:00:00.000Z' },
    )

    const result = mergeHobbies(set, set)

    expect(result).toEqual(set)
  })
})

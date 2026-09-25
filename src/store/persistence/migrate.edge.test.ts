import { describe, expect, it } from 'vitest'
import { migrate } from './migrate'

describe('migrate — corrupt entries', () => {
  it('drops non-string dates and hobbies without the required shape', () => {
    const raw = {
      schemaVersion: 1,
      hobbies: [
        { id: 'ok', start: '2026-09-07', sched: [], payments: [] },
        { id: 42, start: '2026-09-07', sched: [], payments: [] },
        'garbage',
      ],
      settings: { renewSnoozedUntil: { ok: '2026-09-25', bad: 7 } },
      deletedHobbies: { gone: '2026-09-20T10:00:00.000Z', broken: null },
    }
    const state = migrate(raw, 'en')
    expect(state.hobbies.map((h) => h.id)).toEqual(['ok'])
    expect(state.settings.renewSnoozedUntil).toEqual({ ok: '2026-09-25' })
    expect(state.deletedHobbies).toEqual({ gone: '2026-09-20T10:00:00.000Z' })
  })
})

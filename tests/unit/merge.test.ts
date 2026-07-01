import { describe, it, expect } from 'vitest'
import { mergeSnapshots } from '@/sync/merge'
import { EMPTY_SNAPSHOT, type Snapshot } from '@/sync/snapshot'

function snap(over: Partial<Snapshot>): Snapshot {
  return { ...EMPTY_SNAPSHOT, ...over }
}

describe('mergeSnapshots', () => {
  it('newer updatedAt wins for the same id (no duplication)', () => {
    const local = snap({
      vehicles: [{ id: 'v1', name: 'Old', updatedAt: '2026-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' } as never],
    })
    const remote = snap({
      vehicles: [{ id: 'v1', name: 'New', updatedAt: '2026-02-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' } as never],
    })
    const merged = mergeSnapshots(local, remote)
    expect(merged.vehicles).toHaveLength(1)
    expect((merged.vehicles[0] as { name: string }).name).toBe('New')
  })

  it('disjoint records from both sides are unioned (no loss)', () => {
    const local = snap({ fuelLogs: [{ id: 'a', createdAt: '2026-01-01T00:00:00Z' } as never] })
    const remote = snap({ fuelLogs: [{ id: 'b', createdAt: '2026-01-02T00:00:00Z' } as never] })
    const merged = mergeSnapshots(local, remote)
    expect(merged.fuelLogs.map((r) => (r as { id: string }).id).sort()).toEqual(['a', 'b'])
  })

  it('a tombstone newer than the record removes it', () => {
    const local = snap({
      fuelLogs: [{ id: 'a', createdAt: '2026-01-01T00:00:00Z' } as never],
      tombstones: [{ id: 'a', entity: 'fuelLogs', deletedAt: '2026-01-05T00:00:00Z' }],
    })
    const remote = snap({ fuelLogs: [{ id: 'a', createdAt: '2026-01-01T00:00:00Z' } as never] })
    const merged = mergeSnapshots(local, remote)
    expect(merged.fuelLogs).toHaveLength(0)
    expect(merged.tombstones).toHaveLength(1)
  })

  it('a record re-created after its tombstone survives', () => {
    const local = snap({
      expenses: [{ id: 'e', createdAt: '2026-03-01T00:00:00Z' } as never],
      tombstones: [{ id: 'e', entity: 'expenses', deletedAt: '2026-01-01T00:00:00Z' }],
    })
    const merged = mergeSnapshots(local, EMPTY_SNAPSHOT)
    expect(merged.expenses).toHaveLength(1)
  })

  it('keeps the newest deletedAt when tombstones for the same id differ', () => {
    const local = snap({ tombstones: [{ id: 'x', entity: 'reminders', deletedAt: '2026-01-01T00:00:00Z' }] })
    const remote = snap({ tombstones: [{ id: 'x', entity: 'reminders', deletedAt: '2026-02-01T00:00:00Z' }] })
    const merged = mergeSnapshots(local, remote)
    expect(merged.tombstones).toHaveLength(1)
    expect(merged.tombstones[0].deletedAt).toBe('2026-02-01T00:00:00Z')
  })
})

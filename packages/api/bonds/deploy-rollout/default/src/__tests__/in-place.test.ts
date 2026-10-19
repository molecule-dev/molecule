/**
 * The in-place state machine, ported from the platform's rolling-Machine helper.
 *
 * The property under test is the outage safety of a per-instance roll: never more
 * than one instance down at a time, never a step while no other instance is
 * serving, and a failure restores everything the run touched while leaving the
 * untouched instances alone.
 */
import { describe, expect, it } from 'vitest'

import type { RolloutInstance } from '@molecule/api-deploy-rollout'

import { RolloutAbortedError, runInPlace } from '../provider.js'

/** A fleet double that records how many instances are "down" at any instant. */
const fleet = (
  ids: string[],
): {
  serving: Set<string>
  events: string[]
  readonly maxDown: number
  down: (id: string) => void
  up: (id: string) => void
} => {
  const serving = new Set(ids)
  const events: string[] = []
  let maxDown = 0
  return {
    serving,
    events,
    get maxDown() {
      return maxDown
    },
    down(id) {
      serving.delete(id)
      events.push(`down:${id}`)
      maxDown = Math.max(maxDown, ids.length - serving.size)
    },
    up(id) {
      serving.add(id)
      events.push(`up:${id}`)
    },
  }
}

/** A clock + sleep pair that advance together, so soak tests never wait. */
const fakeClock = (): { now: () => number; sleep: (ms: number) => Promise<void> } => {
  let clock = 0
  return {
    now: () => clock,
    sleep: async (ms) => {
      clock += ms
    },
  }
}

const machines = (ids: string[]): RolloutInstance[] => ids.map((id) => ({ id }))

describe('runInPlace', () => {
  it('changes instances one at a time, always leaving a sibling serving', async () => {
    const machineIds = ['m1', 'm2', 'm3']
    const state = fleet(machineIds)
    const applied: string[] = []

    const result = await runInPlace({
      machines: machines(machineIds),
      probeServing: async (id) => state.serving.has(id),
      apply: async (machine) => {
        state.down(machine.id)
        applied.push(machine.id)
        state.up(machine.id)
      },
      rollback: async () => {
        throw new Error('rollback must not run on a successful roll')
      },
    })

    expect(applied).toEqual(['m1', 'm2', 'm3'])
    expect(result.applied).toEqual(['m1', 'm2', 'm3'])
    expect(state.maxDown).toBe(1)
  })

  it('refuses to start when no other instance is serving', async () => {
    const state = fleet(['m1', 'm2'])
    state.serving.delete('m2')

    const apply = async (): Promise<void> => {
      throw new Error('apply must not run')
    }
    await expect(
      runInPlace({
        machines: machines(['m1', 'm2']),
        probeServing: async (id) => state.serving.has(id),
        apply,
        rollback: async () => {},
      }),
    ).rejects.toBeInstanceOf(RolloutAbortedError)
  })

  it('aborts on a failed instance and rolls back every touched instance, newest first', async () => {
    const state = fleet(['m1', 'm2', 'm3'])
    const rolledBack: string[] = []
    const applied: string[] = []

    const error = await runInPlace({
      machines: machines(['m1', 'm2', 'm3']),
      probeServing: async (id) => state.serving.has(id),
      apply: async (machine) => {
        if (machine.id === 'm2') {
          state.down(machine.id)
          throw new Error('readiness failed')
        }
        applied.push(machine.id)
      },
      rollback: async (machine) => {
        rolledBack.push(machine.id)
      },
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(RolloutAbortedError)
    expect((error as RolloutAbortedError).failed).toBe('m2')
    expect(applied).toEqual(['m1'])
    // m2 failed and m1 had already been changed; m3 was never touched.
    expect(rolledBack).toEqual(['m2', 'm1'])
    expect((error as RolloutAbortedError).rolledBack).toEqual(['m2', 'm1'])
  })

  it('keeps rolling back after one rollback itself fails', async () => {
    const state = fleet(['m1', 'm2'])
    const rolledBack: string[] = []
    const error = await runInPlace({
      machines: machines(['m1', 'm2']),
      probeServing: async (id) => state.serving.has(id),
      apply: async (machine) => {
        if (machine.id === 'm2') throw new Error('boom')
      },
      rollback: async (machine) => {
        rolledBack.push(machine.id)
        if (machine.id === 'm2') throw new Error('rollback also failed')
      },
    }).catch((caught: unknown) => caught)

    expect(rolledBack).toEqual(['m2', 'm1'])
    expect((error as RolloutAbortedError).rollbackFailures.map((f) => f.instance.id)).toEqual([
      'm2',
    ])
    expect((error as RolloutAbortedError).rolledBack).toEqual(['m1'])
  })

  it('a single-instance target needs no probe', async () => {
    const applied: string[] = []
    const result = await runInPlace({
      machines: machines(['m1']),
      apply: async (machine) => {
        applied.push(machine.id)
      },
      rollback: async () => {},
    })
    expect(result.applied).toEqual(['m1'])
  })

  it('soaks a changed instance for the full window before touching the next one', async () => {
    const state = fleet(['m1', 'm2'])
    const { now, sleep } = fakeClock()
    const appliedAt: Array<[string, number]> = []

    await runInPlace({
      machines: machines(['m1', 'm2']),
      probeServing: async (id) => state.serving.has(id),
      apply: async (machine) => {
        appliedAt.push([machine.id, now()])
        state.down(machine.id)
        state.up(machine.id)
      },
      rollback: async () => {
        throw new Error('rollback must not run on a successful roll')
      },
      policy: { soakMs: 30_000, soakProbeMs: 2_000 },
      now,
      sleep,
    })

    // m2 is not touched until m1 has answered for a full 30 s.
    expect(appliedAt[0]).toEqual(['m1', 0])
    expect(appliedAt[1][0]).toBe('m2')
    expect(appliedAt[1][1]).toBeGreaterThanOrEqual(30_000)
  })

  it('restarts the soak window when the instance stops answering mid-soak', async () => {
    const state = fleet(['m1', 'm2'])
    const { now, sleep } = fakeClock()
    const appliedAt: Array<[string, number]> = []
    // Probes land on 2 s boundaries; m1 fails exactly at 10 s and 12 s.
    const blips = new Set([10_000, 12_000])

    await runInPlace({
      machines: machines(['m1', 'm2']),
      probeServing: async (id) => {
        if (id === 'm1' && blips.has(now())) return false
        return state.serving.has(id)
      },
      apply: async (machine) => {
        appliedAt.push([machine.id, now()])
        state.down(machine.id)
        state.up(machine.id)
      },
      rollback: async () => {
        throw new Error('rollback must not run on a successful roll')
      },
      policy: { soakMs: 30_000, soakProbeMs: 2_000 },
      now,
      sleep,
    })

    // The window restarted at 12 s, so m2 waits until 42 s — not 30 s.
    expect(appliedAt[1][0]).toBe('m2')
    expect(appliedAt[1][1]).toBeGreaterThanOrEqual(42_000)
  })

  it('aborts and rolls back when an instance never stays healthy for the soak', async () => {
    const state = fleet(['m1', 'm2'])
    const { now, sleep } = fakeClock()
    const rolledBack: string[] = []

    const error = await runInPlace({
      machines: machines(['m1', 'm2']),
      probeServing: async (id) => (id === 'm1' ? false : state.serving.has(id)),
      apply: async (machine) => {
        if (machine.id !== 'm1') throw new Error('apply must not be called again')
      },
      rollback: async (machine) => {
        rolledBack.push(machine.id)
      },
      policy: { soakMs: 30_000, soakGraceMs: 6_000, soakProbeMs: 2_000 },
      now,
      sleep,
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(RolloutAbortedError)
    expect((error as RolloutAbortedError).failed).toBe('m1')
    expect(rolledBack).toEqual(['m1'])
  })

  it('treats a probe that throws during the soak as not serving', async () => {
    const { now, sleep } = fakeClock()
    let calls = 0

    const error = await runInPlace({
      // One instance, so the only probe is the soak's own.
      machines: machines(['m1']),
      probeServing: async () => {
        calls += 1
        throw new Error('ssh failed')
      },
      apply: async () => {},
      rollback: async () => {},
      policy: { soakMs: 30_000, soakGraceMs: 4_000, soakProbeMs: 2_000 },
      now,
      sleep,
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(RolloutAbortedError)
    expect(calls).toBeGreaterThan(0)
  })

  it('refuses a soak without probeServing', async () => {
    await expect(
      runInPlace({
        machines: machines(['m1']),
        apply: async () => {},
        rollback: async () => {},
        policy: { soakMs: 30_000 },
      }),
    ).rejects.toThrow(/soakMs requires probeServing/)
  })

  it('takes the instance list from the provider when none is given', async () => {
    const listed = machines(['m1', 'm2'])
    const replaced: string[] = []
    const result = await runInPlace({
      provider: {
        name: 'fake',
        list: async () => listed,
        isServing: async () => true,
        replace: async (machine) => {
          replaced.push(machine.id)
        },
        restore: async () => {},
      },
    })
    expect(replaced).toEqual(['m1', 'm2'])
    expect(result.instances.map((machine) => machine.id)).toEqual(['m1', 'm2'])
  })
})

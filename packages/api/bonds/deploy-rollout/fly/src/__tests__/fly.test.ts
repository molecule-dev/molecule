/**
 * The Fly Machines adapter: the `machine list` parse, the homogeneity refusal and
 * the provider operations driven by a fake flyctl runner.
 */
import { describe, expect, it, vi } from 'vitest'

import type { FlyCommandResult } from '../fly.js'
import {
  assertHomogeneousFlyMachines,
  createFlyInPlaceProvider,
  createFlyInstanceProvider,
  parseFlyMachineList,
  restartFlyMachine,
} from '../fly.js'

const machine = (id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  state: 'started',
  config: {
    image: { registry: 'registry.fly.io', repository: 'molecule-api', tag: 'deployment-1' },
  },
  instance_id: 'v1',
  ...overrides,
})

const runner = (responses: FlyCommandResult[]): ReturnType<typeof vi.fn> => {
  const fn = vi.fn(async () => responses.shift() ?? { status: 0, stdout: '[]' })
  return fn
}

describe('parseFlyMachineList', () => {
  it('parses the image ref and the configuration version', () => {
    const parsed = parseFlyMachineList(JSON.stringify([machine('a'.repeat(14))]))
    expect(parsed).toEqual([
      {
        id: 'a'.repeat(14),
        upstreamUrl: undefined,
        state: 'started',
        imageRef: 'registry.fly.io/molecule-api:deployment-1',
        version: 'v1',
        gracePeriodMs: 0,
      },
    ])
  })

  it('parses a by-digest image ref', () => {
    const parsed = parseFlyMachineList(
      JSON.stringify([
        machine('b'.repeat(14), {
          config: {
            image: {
              registry: 'registry.fly.io',
              repository: 'molecule-api',
              digest: 'sha256:abc',
            },
          },
          instance_id: undefined,
          version: 'v2',
        }),
      ]),
    )
    expect(parsed[0]?.imageRef).toBe('registry.fly.io/molecule-api@sha256:abc')
    expect(parsed[0]?.version).toBe('v2')
  })

  it('reads the longest service-check grace period', () => {
    const parsed = parseFlyMachineList(
      JSON.stringify([
        machine('c'.repeat(14), {
          config: {
            image: { registry: 'registry.fly.io', repository: 'molecule-api', tag: 'd1' },
            services: [
              { checks: [{ grace_period: '5s' }, { grace_period: '1m0s' }] },
              { checks: [{ grace_period: '500ms' }] },
            ],
          },
        }),
      ]),
    )
    expect(parsed[0]?.gracePeriodMs).toBe(60_000)
  })

  it('reads a top-level image_ref from older flyctl output', () => {
    const parsed = parseFlyMachineList(
      JSON.stringify([
        {
          id: 'e'.repeat(14),
          state: 'started',
          image_ref: { registry: 'registry.fly.io', repository: 'molecule-api', tag: 'd1' },
          instance_id: 'v1',
        },
      ]),
    )
    expect(parsed[0]?.imageRef).toBe('registry.fly.io/molecule-api:d1')
  })

  it('refuses output that is not an array', () => {
    expect(() => parseFlyMachineList('{"error":"nope"}')).toThrow(/did not return an array/)
    expect(() => parseFlyMachineList('not json')).toThrow(/could not parse/)
  })
})

describe('assertHomogeneousFlyMachines', () => {
  const parsed = (
    ids: string[],
    overrides: Record<string, unknown> = {},
  ): ReturnType<typeof parseFlyMachineList> =>
    parseFlyMachineList(JSON.stringify(ids.map((id) => machine(id, overrides))))

  it('accepts a homogeneous set and returns every id', () => {
    const ids = ['a'.repeat(14), 'b'.repeat(14)]
    const targets = assertHomogeneousFlyMachines(parsed(ids))
    expect(targets.ids).toEqual(ids)
    expect(targets.imageRef).toBe('registry.fly.io/molecule-api:deployment-1')
  })

  it('refuses a stopped Machine', () => {
    const machines = parseFlyMachineList(
      JSON.stringify([machine('a'.repeat(14)), machine('b'.repeat(14), { state: 'stopped' })]),
    )
    expect(() => assertHomogeneousFlyMachines(machines)).toThrow(/not started/)
  })

  it('refuses a set running mixed builds', () => {
    const machines = parseFlyMachineList(
      JSON.stringify([
        machine('a'.repeat(14)),
        machine('b'.repeat(14), {
          config: {
            image: { registry: 'registry.fly.io', repository: 'molecule-api', tag: 'deployment-2' },
          },
        }),
      ]),
    )
    expect(() => assertHomogeneousFlyMachines(machines)).toThrow(/MIXED builds/)
  })

  it('refuses a malformed machine id', () => {
    expect(() => assertHomogeneousFlyMachines(parsed(['nope']))).toThrow(/unexpected machine id/)
  })
})

describe('restartFlyMachine', () => {
  it('waits for the Machine to reach started', async () => {
    const run = runner([
      { status: 0, stdout: '' }, // machine restart
      { status: 0, stdout: JSON.stringify([machine('a'.repeat(14), { state: 'starting' })]) },
      { status: 0, stdout: JSON.stringify([machine('a'.repeat(14), { state: 'started' })]) },
    ])
    const started = await restartFlyMachine(
      { app: 'molecule-api', run, pollMs: 1, restartBudgetMs: 100 },
      'a'.repeat(14),
    )
    expect(started).toBe(true)
  })

  it('starts a Machine that comes back stopped', async () => {
    const run = runner([
      { status: 0, stdout: '' }, // restart
      { status: 0, stdout: JSON.stringify([machine('a'.repeat(14), { state: 'stopped' })]) },
      { status: 0, stdout: '' }, // machine start
      { status: 0, stdout: JSON.stringify([machine('a'.repeat(14), { state: 'started' })]) },
    ])
    const started = await restartFlyMachine(
      { app: 'molecule-api', run, pollMs: 1, restartBudgetMs: 100 },
      'a'.repeat(14),
    )
    expect(started).toBe(true)
    expect(run.mock.calls.map((call) => call[0] as string[])).toContainEqual([
      'machine',
      'start',
      'a'.repeat(14),
      '--app',
      'molecule-api',
    ])
  })

  it('gives up when the Machine never reaches started', async () => {
    const run = runner([
      { status: 0, stdout: '' },
      { status: 0, stdout: JSON.stringify([machine('a'.repeat(14), { state: 'starting' })]) },
    ])
    const started = await restartFlyMachine(
      { app: 'molecule-api', run, pollMs: 1, restartBudgetMs: 2 },
      'a'.repeat(14),
    )
    expect(started).toBe(false)
  })
})

describe('createFlyInPlaceProvider', () => {
  it('lists, gates and restores through the app-specific callbacks', async () => {
    const run = runner([{ status: 0, stdout: JSON.stringify([machine('a'.repeat(14))]) }])
    const restore = vi.fn(async () => {})
    const provider = createFlyInPlaceProvider({
      app: 'molecule-api',
      run,
      isServing: async () => true,
      replace: async () => {},
      restore,
    })
    const listed = await provider.list()
    expect(listed.map((instance) => instance.id)).toEqual(['a'.repeat(14)])
    expect(await provider.isServing(listed[0]!)).toBe(true)
    await provider.replace(listed[0]!)
    await provider.restore(listed[0]!)
    expect(restore).toHaveBeenCalled()
  })
})

describe('createFlyInstanceProvider', () => {
  it('creates through the caller launch, drains by stopping and destroys', async () => {
    const id = 'a'.repeat(14)
    const run = runner([
      { status: 0, stdout: '' }, // machine stop
      { status: 0, stdout: JSON.stringify([machine(id, { state: 'stopped' })]) }, // list
      { status: 0, stdout: '' }, // machine destroy
    ])
    const launchedId = id
    const provider = createFlyInstanceProvider({
      app: 'molecule-api',
      run,
      launch: async (index) => ({ id, upstreamUrl: `https://${index}.example` }),
      isServing: async () => true,
    })
    const instance = await provider.create(0)
    expect(instance.id).toBe(launchedId)
    await provider.drain(instance, 5_000)
    await provider.destroy(instance)
    expect(run.mock.calls.map((call) => call[0] as string[])).toContainEqual([
      'machine',
      'destroy',
      id,
      '--app',
      'molecule-api',
      '--force',
    ])
  })
})

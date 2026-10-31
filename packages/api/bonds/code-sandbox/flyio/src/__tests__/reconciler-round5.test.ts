import { describe, expect, it, vi } from 'vitest'

import type {
  FlyCreateAddressIntent,
  FlyCreateAttempt,
  FlyCreateAttemptJournal,
  FlyCreateAttemptState,
  FlyCreateVolumeIntent,
} from '../lifecycle.js'
import type { FlyioConfig } from '../types.js'
import { createFetchDouble, mockLogger } from './helpers.js'

vi.mock('@molecule/api-bond', () => ({ getLogger: () => mockLogger }))
vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}))

const { FlyApiClient } = await import('../api.js')
const { createProvider } = await import('../provider.js')

const PROJECT_ID = 'a3f1c0de-0000-4000-8000-000000000001'
const APP = `mol-sandbox-${PROJECT_ID}`

class MemoryJournal implements FlyCreateAttemptJournal {
  readonly attempts = new Map<string, FlyCreateAttempt>()
  readonly lockCalls: string[] = []

  async begin(
    attempt: Pick<FlyCreateAttempt, 'attemptId' | 'projectId' | 'appName'>,
  ): Promise<void> {
    this.attempts.set(attempt.attemptId, {
      ...attempt,
      state: 'creating',
      volumes: [],
      addresses: [],
    })
  }

  async recordVolume(attemptId: string, volume: FlyCreateVolumeIntent): Promise<void> {
    const attempt = this.attempts.get(attemptId)
    if (!attempt) throw new Error('missing attempt')
    const index = attempt.volumes.findIndex((candidate) => candidate.name === volume.name)
    if (index < 0) attempt.volumes.push({ ...volume })
    else attempt.volumes[index] = { ...volume }
  }

  async markVolumeWorkspace(attemptId: string, name: string, workspace = true): Promise<void> {
    const volume = this.attempts
      .get(attemptId)
      ?.volumes.find((candidate) => candidate.name === name)
    if (volume) volume.workspace = workspace
  }

  async recordAddress(attemptId: string, address: FlyCreateAddressIntent): Promise<void> {
    const attempt = this.attempts.get(attemptId)
    if (!attempt) throw new Error('missing attempt')
    const index = attempt.addresses.findIndex(
      (candidate) =>
        candidate.targetApp === address.targetApp && candidate.network === address.network,
    )
    if (index < 0) attempt.addresses.push({ ...address })
    else attempt.addresses[index] = { ...address }
  }

  async markState(
    attemptId: string,
    state: FlyCreateAttemptState,
    sandboxId?: string,
  ): Promise<void> {
    const attempt = this.attempts.get(attemptId)
    if (!attempt) throw new Error('missing attempt')
    attempt.state = state
    if (sandboxId) attempt.sandboxId = sandboxId
  }

  async reclaimable(_cutoff: Date): Promise<FlyCreateAttempt[]> {
    return [...this.attempts.values()].filter(
      (attempt) => attempt.state === 'failed' || attempt.state === 'abandoned',
    )
  }

  async withLock<T>(
    attempt: FlyCreateAttempt,
    body: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    this.lockCalls.push(attempt.appName)
    return body(new AbortController().signal)
  }

  async forget(attemptId: string): Promise<void> {
    this.attempts.delete(attemptId)
  }

  seed(attempt: FlyCreateAttempt): void {
    this.attempts.set(attempt.attemptId, structuredClone(attempt))
  }
}

function makeProvider(
  double: ReturnType<typeof createFetchDouble>,
  journal?: MemoryJournal,
  config: FlyioConfig = {},
) {
  const client = new FlyApiClient({
    token: () => 'tok',
    baseUrl: 'https://api.machines.dev/v1',
    fetchImpl: double.fetch,
    sleep: async () => {},
  })
  return createProvider(
    { orgSlug: 'acme', region: 'iad', createAttemptJournal: journal, ...config },
    client,
  )
}

function failedIntent(overrides: Partial<FlyCreateAttempt> = {}): FlyCreateAttempt {
  return {
    attemptId: 'attempt-1',
    projectId: PROJECT_ID,
    appName: APP,
    state: 'failed',
    volumes: [],
    addresses: [],
    ...overrides,
  }
}

describe('journaled create reconciliation', () => {
  it('survives a definite transient volume-create rejection and then succeeds', async () => {
    const double = createFetchDouble()
      .on(`GET /apps/${APP}`, { body: { name: APP, network: APP } })
      .on(`GET /apps/${APP}/volumes`, { body: [] })
      .on(`POST /apps/${APP}/volumes`, { status: 429, body: { error: 'slow down' } })
      .on(`POST /apps/${APP}/volumes`, { body: { id: 'v1', name: 'attempt-volume' } })
      .on(`POST /apps/${APP}/machines`, { body: { id: 'm1', state: 'started' } })
    const journal = new MemoryJournal()

    await expect(
      makeProvider(double, journal).create({ projectId: PROJECT_ID, volumeName: 'workspace' }),
    ).resolves.toMatchObject({ id: `${APP}:m1` })
    expect(double.matching(`POST /apps/${APP}/volumes`)).toHaveLength(2)
    expect([...journal.attempts.values()][0]?.state).toBe('serving')
    expect(double.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
  })

  it('adopts a lost-response volume by its own attempt id without a duplicate POST', async () => {
    const double = createFetchDouble()
      .on(`GET /apps/${APP}`, { body: { name: APP, network: APP } })
      .on(`GET /apps/${APP}/volumes`, { body: [] })
      .on(`POST /apps/${APP}/volumes`, { body: { id: 'v1', name: 'attempt-volume' } })
      .on(`GET /apps/${APP}/volumes`, {
        body: [{ id: 'v1', name: 'will-be-checked-below' }],
      })
      .on(`POST /apps/${APP}/machines`, { body: { id: 'm1', state: 'started' } })
    const journal = new MemoryJournal()
    const baseFetch = double.fetch
    let volumePosts = 0
    let postedName = ''
    double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method ?? 'GET').toUpperCase()
      const isVolumePost = url.endsWith(`/apps/${APP}/volumes`) && method === 'POST'
      if (isVolumePost) {
        postedName = (JSON.parse(String(init?.body)) as { name: string }).name
      }
      if (method === 'GET' && url.endsWith(`/apps/${APP}/volumes`) && postedName) {
        return {
          status: 200,
          headers: { get: () => null },
          text: async () => JSON.stringify([{ id: 'v1', name: postedName }]),
        } as unknown as Response
      }
      const response = await baseFetch(input, init)
      if (isVolumePost && ++volumePosts === 1) throw new Error('response lost')
      return response
    }) as unknown as typeof fetch

    await makeProvider(double, journal).create({ projectId: PROJECT_ID, volumeName: 'workspace' })

    expect(volumePosts).toBe(1)
    const attempt = [...journal.attempts.values()][0]
    const listed = double.calls.find(
      (call) =>
        call.method === 'GET' && call.path === `/apps/${APP}/volumes` && call.body === undefined,
    )
    expect(attempt?.state).toBe('serving')
    expect(attempt?.volumes).toHaveLength(1)
    expect(listed).toBeDefined()
    expect(double.matching(`POST /apps/${APP}/machines`)[0]?.body).toMatchObject({
      config: { mounts: [{ volume: 'v1' }] },
    })
  })

  it('reclaims the actual volume left by an unresolved create response', async () => {
    const double = createFetchDouble()
      .on(`GET /apps/${APP}`, { body: { name: APP, network: APP } })
      .on(`GET /apps/${APP}/volumes`, { body: [] })
      .on(`POST /apps/${APP}/volumes`, { body: { id: 'v1', name: 'attempt-volume' } })
      .on(`GET /apps/${APP}/volumes`, { body: [] })
      .on(`GET /apps/${APP}/volumes`, { body: [] })
      .on(`GET /apps/${APP}/volumes`, { body: [] })
    const journal = new MemoryJournal()
    const baseFetch = double.fetch
    let postedName = ''
    double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const isVolumePost =
        String(input).endsWith(`/apps/${APP}/volumes`) &&
        (init?.method ?? 'GET').toUpperCase() === 'POST'
      if (isVolumePost) postedName = (JSON.parse(String(init?.body)) as { name: string }).name
      const response = await baseFetch(input, init)
      if (isVolumePost) throw new Error('response lost')
      return response
    }) as unknown as typeof fetch
    const provider = makeProvider(double, journal)

    await expect(
      provider.create({ projectId: PROJECT_ID, volumeName: 'workspace' }),
    ).rejects.toThrow('unknown outcome')
    expect(double.matching(`POST /apps/${APP}/volumes`)).toHaveLength(1)
    expect(double.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)

    double
      .on(`GET /apps/${APP}/machines`, { body: [] })
      .on(`GET /apps/${APP}/volumes`, {
        body: [{ id: 'v1', name: postedName, attached_machine_id: null }],
      })
      .on(`DELETE /apps/${APP}/volumes/v1`, { status: 204 })
      .on(`DELETE /apps/${APP}`, { status: 204 })
    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 1, failed: 0 })
    expect(double.matching(`DELETE /apps/${APP}/volumes/v1`)).toHaveLength(1)
    expect(double.matching(`POST /apps/${APP}/volumes`)).toHaveLength(1)
    expect(journal.attempts.size).toBe(0)
  })

  it('records failure without deleting, then reclaims a failed empty app separately', async () => {
    const double = createFetchDouble()
      .on(`GET /apps/${APP}`, { status: 404 })
      .on('POST /apps', { body: { name: APP } })
      .on(`POST /apps/${APP}/machines`, { status: 422, body: { error: 'invalid' } })
      .on(`GET /apps/${APP}/machines`, { body: [] })
      .on(`GET /apps/${APP}/volumes`, { body: [] })
      .on(`DELETE /apps/${APP}`, { status: 204 })
    const journal = new MemoryJournal()
    const provider = makeProvider(double, journal)

    await expect(provider.create({ projectId: PROJECT_ID })).rejects.toThrow('422')
    expect([...journal.attempts.values()][0]?.state).toBe('failed')
    expect(double.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)

    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 1, failed: 0 })
    expect(double.matching(`DELETE /apps/${APP}`)).toHaveLength(1)
    expect(journal.attempts.size).toBe(0)
    expect(journal.lockCalls).toEqual([APP])
  })

  it('deletes an abandoned unbound attempt volume, but never a bound workspace', async () => {
    const unbound = new MemoryJournal()
    unbound.seed(failedIntent({ volumes: [{ name: 'attempt-volume', workspace: false }] }))
    const unboundDouble = createFetchDouble()
      .on(`GET /apps/${APP}/machines`, { body: [] })
      .on(`GET /apps/${APP}/volumes`, {
        body: [{ id: 'v1', name: 'attempt-volume', attached_machine_id: null }],
      })
      .on(`DELETE /apps/${APP}/volumes/v1`, { status: 204 })
      .on(`DELETE /apps/${APP}`, { status: 204 })

    await expect(makeProvider(unboundDouble, unbound).reconcileCreateAttempts()).resolves.toEqual({
      deleted: 1,
      failed: 0,
    })
    expect(unboundDouble.matching(`DELETE /apps/${APP}/volumes/v1`)).toHaveLength(1)

    const workspace = new MemoryJournal()
    workspace.seed(failedIntent({ volumes: [{ name: 'workspace', workspace: true }] }))
    const workspaceDouble = createFetchDouble()
      .on(`GET /apps/${APP}/machines`, { body: [] })
      .on(`GET /apps/${APP}/volumes`, {
        body: [{ id: 'durable', name: 'workspace', attached_machine_id: null }],
      })
    await expect(
      makeProvider(workspaceDouble, workspace).reconcileCreateAttempts(),
    ).resolves.toEqual({
      deleted: 0,
      failed: 0,
    })
    expect(workspaceDouble.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
    expect(workspace.attempts.size).toBe(1)
  })

  it('forgets a serving dev attempt only after explicit destroy completes', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        state: 'serving',
        sandboxId: `${APP}:m1`,
      }),
    )
    const double = createFetchDouble()
      .on(`GET /apps/${APP}/machines/m1`, {
        body: {
          id: 'm1',
          config: { metadata: { 'molecule-sandbox.createAttempt': 'attempt-1' } },
        },
      })
      .on(`DELETE /apps/${APP}/machines/m1`, { status: 204 })
      .on(`DELETE /apps/${APP}`, { status: 204 })

    await makeProvider(double, journal).destroy(`${APP}:m1`)

    expect(double.matching(`DELETE /apps/${APP}/machines/m1`)).toHaveLength(1)
    expect(
      double.calls.filter((call) => call.method === 'DELETE' && call.path === `/apps/${APP}`),
    ).toHaveLength(1)
    expect(journal.attempts.size).toBe(0)
  })

  it('retains a failed attempt while Fly still reports its Machine serving', async () => {
    const journal = new MemoryJournal()
    journal.seed(failedIntent())
    const double = createFetchDouble().on(`GET /apps/${APP}/machines`, {
      body: [{ id: 'm1', name: 'attempt-1', state: 'started' }],
    })

    await expect(makeProvider(double, journal).reconcileCreateAttempts()).resolves.toEqual({
      deleted: 0,
      failed: 0,
    })
    expect(double.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
    expect(journal.attempts.size).toBe(1)
  })

  it('releases recorded addresses before forgetting, and retains unresolved ownership', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        addresses: [
          { targetApp: 'tenant-db', network: APP, ip: 'fdaa::2', owned: true, resolved: true },
        ],
      }),
    )
    const double = createFetchDouble()
      .on(`GET /apps/${APP}/machines`, { body: [] })
      .on(`GET /apps/${APP}/volumes`, { body: [] })
      .on('DELETE /apps/tenant-db/ip_assignments/', { status: 204 })
      .on(`DELETE /apps/${APP}`, { status: 204 })

    await makeProvider(double, journal).reconcileCreateAttempts()
    const deletes = double.calls.filter((call) => call.method === 'DELETE')
    expect(deletes.map((call) => call.path)).toEqual([
      '/apps/tenant-db/ip_assignments/fdaa%3A%3A2',
      `/apps/${APP}`,
    ])
    expect(journal.attempts.size).toBe(0)

    const unresolved = new MemoryJournal()
    unresolved.seed(
      failedIntent({
        addresses: [{ targetApp: 'tenant-db', network: APP, owned: false, resolved: false }],
      }),
    )
    const unresolvedDouble = createFetchDouble()
      .on(`GET /apps/${APP}/machines`, { body: [] })
      .on(`GET /apps/${APP}/volumes`, { body: [] })
    await expect(
      makeProvider(unresolvedDouble, unresolved).reconcileCreateAttempts(),
    ).resolves.toEqual({ deleted: 0, failed: 1 })
    expect(unresolvedDouble.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
    expect(unresolved.attempts.size).toBe(1)
  })
})

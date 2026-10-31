import { describe, expect, it, vi } from 'vitest'

import { encodePrivateRoutes } from '../flycast.js'
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
      generation: 1,
      volumes: [],
      addresses: [],
    })
  }

  async get(attemptId: string): Promise<FlyCreateAttempt | null> {
    const attempt = this.attempts.get(attemptId)
    return attempt ? structuredClone(attempt) : null
  }

  async forApp(appName: string): Promise<FlyCreateAttempt[]> {
    return [...this.attempts.values()]
      .filter((attempt) => attempt.appName === appName)
      .map((attempt) => structuredClone(attempt))
  }

  async findWorkspace(
    _projectId: string,
    logicalName: string,
  ): Promise<FlyCreateVolumeIntent | null> {
    for (const attempt of this.attempts.values()) {
      const volume = attempt.volumes.find(
        (candidate) => candidate.workspace && candidate.logicalName === logicalName && candidate.id,
      )
      if (volume) return structuredClone(volume)
    }
    return null
  }

  async recordVolume(attemptId: string, volume: FlyCreateVolumeIntent): Promise<void> {
    const attempt = this.attempts.get(attemptId)
    if (!attempt) throw new Error('missing attempt')
    if (volume.id) {
      // Adoption transfers the durable Fly-ID binding; an older attempt keeps
      // no name-only capability that could later delete the workspace.
      for (const other of this.attempts.values()) {
        other.volumes = other.volumes.filter(
          (candidate) =>
            candidate.id !== volume.id &&
            !(!candidate.id && candidate.name === volume.name && other.attemptId !== attemptId),
        )
      }
    }
    const index = attempt.volumes.findIndex((candidate) => candidate.name === volume.name)
    if (index < 0) attempt.volumes.push({ ...volume })
    else {
      attempt.volumes[index] = {
        ...volume,
        workspace: attempt.volumes[index].workspace || volume.workspace,
      }
    }
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
    if (address.owned && address.ip) {
      for (const other of this.attempts.values()) {
        if (other.attemptId === attemptId) continue
        other.addresses = other.addresses.filter(
          (candidate) =>
            candidate.targetApp !== address.targetApp ||
            (candidate.network !== address.network && candidate.ip !== address.ip),
        )
      }
    }
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

  async assertGeneration(attemptId: string, generation: number): Promise<void> {
    const attempt = this.attempts.get(attemptId)
    if (!attempt || (attempt.generation ?? 1) !== generation) {
      throw new Error(`Stale generation for ${attemptId}`)
    }
  }

  async reclaimable(_cutoff: Date): Promise<FlyCreateAttempt[]> {
    return [...this.attempts.values()]
      .filter((attempt) => attempt.state === 'failed' || attempt.state === 'abandoned')
      .map((attempt) => structuredClone(attempt))
  }

  async withLock<T>(
    attempt: FlyCreateAttempt,
    body: (signal: AbortSignal, generation: number) => Promise<T>,
  ): Promise<T> {
    this.lockCalls.push(attempt.appName)
    const current = this.attempts.get(attempt.attemptId)
    if (!current) throw new Error('missing attempt')
    current.generation = (current.generation ?? 1) + 1
    return body(new AbortController().signal, current.generation)
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

    for (let read = 0; read < 6; read++) double.on(`GET /apps/${APP}/machines`, { body: [] })
    for (let read = 0; read < 3; read++) {
      double.on(`GET /apps/${APP}/volumes`, {
        body: [{ id: 'v1', name: postedName, attached_machine_id: null }],
      })
    }
    for (let read = 0; read < 3; read++) double.on(`GET /apps/${APP}/volumes`, { body: [] })
    double
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
    for (let read = 0; read < 4; read++) {
      double
        .on(`GET /apps/${APP}/machines`, { body: [] })
        .on(`GET /apps/${APP}/volumes`, { body: [] })
    }
    double.on(`DELETE /apps/${APP}`, { status: 204 })
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
    for (let read = 0; read < 6; read++) unboundDouble.on(`GET /apps/${APP}/machines`, { body: [] })
    for (let read = 0; read < 3; read++) {
      unboundDouble.on(`GET /apps/${APP}/volumes`, {
        body: [{ id: 'v1', name: 'attempt-volume', attached_machine_id: null }],
      })
    }
    for (let read = 0; read < 3; read++) unboundDouble.on(`GET /apps/${APP}/volumes`, { body: [] })
    unboundDouble
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
    for (let read = 0; read < 3; read++) {
      workspaceDouble.on(`GET /apps/${APP}/machines`, { body: [] }).on(`GET /apps/${APP}/volumes`, {
        body: [{ id: 'durable', name: 'workspace', attached_machine_id: null }],
      })
    }
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
      .fallback({ body: [] })
      .on(`GET /apps/${APP}/machines/m1`, {
        body: {
          id: 'm1',
          config: { metadata: { 'molecule-sandbox.createAttempt': 'attempt-1' } },
        },
      })
    for (let read = 0; read < 2; read++) {
      double.on(`GET /apps/${APP}/machines`, {
        body: [{ id: 'm1', name: 'attempt-1', state: 'started' }],
      })
    }
    double
      .on(`DELETE /apps/${APP}/machines/m1`, { status: 204 })
      .on(`DELETE /apps/${APP}`, { status: 204 })

    await makeProvider(double, journal).destroy(`${APP}:m1`)

    expect(double.matching(`DELETE /apps/${APP}/machines/m1`)).toHaveLength(1)
    expect(
      double.calls.filter(
        (call) => call.method === 'DELETE' && call.path === `/apps/${APP}?force=true`,
      ),
    ).toHaveLength(1)
    expect(journal.attempts.size).toBe(0)
  })

  it('retains a failed attempt while Fly still reports its Machine serving', async () => {
    const journal = new MemoryJournal()
    journal.seed(failedIntent())
    const double = createFetchDouble()
      .on(`GET /apps/${APP}/machines`, {
        body: [{ id: 'm1', name: 'attempt-1', state: 'started' }],
      })
      .on(`GET /apps/${APP}/volumes`, { body: [] })

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
    for (let read = 0; read < 4; read++) {
      double
        .on(`GET /apps/${APP}/machines`, { body: [] })
        .on(`GET /apps/${APP}/volumes`, { body: [] })
    }
    double
      .on('GET /apps/tenant-db/ip_assignments', {
        body: [{ ip: 'fdaa::2', network: APP }],
      })
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
    for (let read = 0; read < 2; read++) {
      unresolvedDouble
        .on(`GET /apps/${APP}/machines`, { body: [] })
        .on(`GET /apps/${APP}/volumes`, { body: [] })
    }
    unresolvedDouble.on('GET /apps/tenant-db/ip_assignments', { body: [] })
    await expect(
      makeProvider(unresolvedDouble, unresolved).reconcileCreateAttempts(),
    ).resolves.toEqual({ deleted: 0, failed: 1 })
    expect(unresolvedDouble.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
    expect(unresolved.attempts.size).toBe(1)
  })
})

describe('round-six ownership races', () => {
  it('re-reads a serving transition after lock acquisition instead of deleting the suspended Machine', async () => {
    const journal = new MemoryJournal()
    journal.seed(failedIntent())
    const locked = journal.withLock.bind(journal)
    journal.withLock = async <T>(
      attempt: FlyCreateAttempt,
      body: (signal: AbortSignal, generation: number) => Promise<T>,
    ): Promise<T> =>
      locked(attempt, async (signal, generation) => {
        await journal.markState(attempt.attemptId, 'serving', `${APP}:m1`)
        return body(signal, generation)
      })
    const double = createFetchDouble().fallback({ body: [] })

    await expect(makeProvider(double, journal).reconcileCreateAttempts()).resolves.toEqual({
      deleted: 0,
      failed: 0,
    })
    expect(double.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
    expect(journal.attempts.size).toBe(1)
  })

  it('cannot delete a volume whose Fly-ID binding a later attempt adopted', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        volumes: [{ id: 'v1', name: 'shared-workspace', workspace: false, resolved: true }],
      }),
    )
    journal.seed(
      failedIntent({ attemptId: 'attempt-2', state: 'serving', volumes: [], addresses: [] }),
    )
    await journal.recordVolume('attempt-2', {
      id: 'v1',
      name: 'shared-workspace',
      logicalName: 'workspace',
      workspace: true,
      resolved: true,
    })
    const double = createFetchDouble()
    for (let read = 0; read < 2; read++) {
      double.on(`GET /apps/${APP}/machines`, { body: [] }).on(`GET /apps/${APP}/volumes`, {
        body: [{ id: 'v1', name: 'shared-workspace', attached_machine_id: null }],
      })
    }

    await makeProvider(double, journal, {
      appPerProject: false,
      appName: APP,
    }).reconcileCreateAttempts()
    expect(double.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
    expect(journal.attempts.get('attempt-2')?.volumes[0]?.id).toBe('v1')
  })

  it('recreates a sandbox from its durable volume-ID binding, never a replacement', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        state: 'serving',
        volumes: [
          {
            id: 'v1',
            name: 'workspace_attempt-name',
            logicalName: 'workspace',
            workspace: true,
            resolved: true,
          },
        ],
      }),
    )
    const double = createFetchDouble()
      .on(`GET /apps/${APP}`, { body: { name: APP } })
      .on(`GET /apps/${APP}/volumes`, {
        body: [{ id: 'v1', name: 'workspace_attempt-name', state: 'ready' }],
      })
      .on(`POST /apps/${APP}/machines`, { body: { id: 'm2', state: 'started' } })

    await makeProvider(double, journal).create({ projectId: PROJECT_ID, volumeName: 'workspace' })
    expect(double.matching(`POST /apps/${APP}/volumes`)).toHaveLength(0)
    expect(double.matching(`POST /apps/${APP}/machines`)[0]?.body).toMatchObject({
      config: { mounts: [{ volume: 'v1' }] },
    })
  })

  it('retains unresolved volume responsibility after a negative read and after a transient list 404', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({ volumes: [{ name: 'attempt-volume', workspace: false, resolved: false }] }),
    )
    const absent = createFetchDouble()
    for (let read = 0; read < 2; read++) {
      absent
        .on(`GET /apps/${APP}/machines`, { body: [] })
        .on(`GET /apps/${APP}/volumes`, { body: [] })
    }
    await expect(makeProvider(absent, journal).reconcileCreateAttempts()).resolves.toEqual({
      deleted: 0,
      failed: 1,
    })
    expect(absent.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)

    const list404 = createFetchDouble()
      .on(`GET /apps/${APP}/machines`, { status: 404, body: { error: 'not propagated' } })
      .on(`GET /apps/${APP}/volumes`, { body: [] })
      .on(`GET /apps/${APP}`, { body: { name: APP } })
    await expect(makeProvider(list404, journal).reconcileCreateAttempts()).resolves.toEqual({
      deleted: 0,
      failed: 1,
    })
    expect(list404.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
    expect(journal.attempts.size).toBe(1)
  })

  it('clears provisional workspace binding on a definite 412 Machine rejection', async () => {
    const journal = new MemoryJournal()
    const double = createFetchDouble()
      .on(`GET /apps/${APP}`, { body: { name: APP } })
      .on(`GET /apps/${APP}/volumes`, { body: [] })
      .on(`POST /apps/${APP}/volumes`, { body: { id: 'v1', name: 'attempt-volume' } })
      .on(`POST /apps/${APP}/machines`, {
        status: 412,
        body: { error: 'failed_precondition: definite rejection' },
      })

    await expect(
      makeProvider(double, journal).create({ projectId: PROJECT_ID, volumeName: 'workspace' }),
    ).rejects.toThrow('412')
    const attempt = [...journal.attempts.values()].find((candidate) => candidate.state === 'failed')
    expect(attempt?.volumes[0]).toMatchObject({ id: 'v1', workspace: false, resolved: true })
  })

  it('adopts a lost Flycast allocation by target app and network after a 422 retry', async () => {
    const journal = new MemoryJournal()
    const double = createFetchDouble()
      .on(`GET /apps/${APP}`, { body: { name: APP } })
      .on('POST /apps/tenant-db/ip_assignments', { body: { ip: 'fdaa::9', network: APP } })
      .on('POST /apps/tenant-db/ip_assignments', { status: 422, body: { error: 'taken' } })
      .on('GET /apps/tenant-db/ip_assignments', { body: [{ ip: 'fdaa::9', network: APP }] })
      .on(`POST /apps/${APP}/machines`, { body: { id: 'm1', state: 'started' } })
    const baseFetch = double.fetch
    let first = true
    double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const response = await baseFetch(input, init)
      if (first && (init?.method ?? 'GET').toUpperCase() === 'POST') {
        first = false
        throw new Error('allocation response lost')
      }
      return response
    }) as unknown as typeof fetch

    await makeProvider(double, journal, {
      privateServices: [{ app: 'tenant-db', port: 5432 }],
    }).create({ projectId: PROJECT_ID })
    const attempt = [...journal.attempts.values()].find(
      (candidate) => candidate.state === 'serving',
    )
    expect(attempt?.addresses).toEqual([
      { targetApp: 'tenant-db', network: APP, ip: 'fdaa::9', owned: true, resolved: true },
    ])
  })

  it('retries retirement from durable addresses and never deletes the app before release', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        // No Machine remains on the retry, so only forApp's durable lookup can
        // find this serving record and its external-address responsibility.
        state: 'serving',
        addresses: [
          { targetApp: 'tenant-db', network: APP, ip: 'fdaa::10', owned: true, resolved: true },
        ],
      }),
    )
    const double = createFetchDouble().fallback({ body: [] })
    double
      .on('GET /apps/tenant-db/ip_assignments', { body: [{ ip: 'fdaa::10', network: APP }] })
      .on('GET /apps/tenant-db/ip_assignments', { body: [{ ip: 'fdaa::10', network: APP }] })
    for (let attempt = 0; attempt < 4; attempt++) {
      double.on('DELETE /apps/tenant-db/ip_assignments/', { status: 500, body: { error: 'down' } })
    }
    double.on('DELETE /apps/tenant-db/ip_assignments/', { status: 204 })

    await expect(makeProvider(double, journal).destroyApp(PROJECT_ID)).rejects.toThrow('500')
    expect(double.matching(`DELETE /apps/${APP}`)).toHaveLength(0)
    expect(journal.attempts.size).toBe(1)

    await makeProvider(double, journal).destroyApp(PROJECT_ID)
    const deletes = double.calls.filter((call) => call.method === 'DELETE').map((call) => call.path)
    expect(deletes.indexOf('/apps/tenant-db/ip_assignments/fdaa%3A%3A10')).toBeLessThan(
      deletes.findIndex((path) => path.startsWith(`/apps/${APP}`)),
    )
    expect(journal.attempts.size).toBe(0)
  })

  it('does not delete an app while a serving sibling still has no visible Machine', async () => {
    const journal = new MemoryJournal()
    journal.seed(failedIntent())
    journal.seed(
      failedIntent({ attemptId: 'attempt-2', state: 'serving', volumes: [], addresses: [] }),
    )
    const double = createFetchDouble().fallback({ body: [] })

    await expect(makeProvider(double, journal).reconcileCreateAttempts()).resolves.toEqual({
      deleted: 0,
      failed: 0,
    })
    expect(double.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
    expect(journal.attempts.size).toBe(2)
  })

  it('transfers a concrete Flycast address so an older attempt cannot release it', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        addresses: [
          { targetApp: 'tenant-db', network: APP, ip: 'fdaa::11', owned: true, resolved: true },
        ],
      }),
    )
    journal.seed(failedIntent({ attemptId: 'attempt-2' }))
    await journal.recordAddress('attempt-2', {
      targetApp: 'tenant-db',
      network: APP,
      ip: 'fdaa::11',
      owned: true,
      resolved: true,
    })
    const double = createFetchDouble().fallback({ body: [] })

    await makeProvider(double, journal).reconcileCreateAttempts({ attemptId: 'attempt-1' })
    expect(double.matching('DELETE /apps/tenant-db/ip_assignments/')).toHaveLength(0)
    expect(journal.attempts.get('attempt-2')?.addresses[0]?.owned).toBe(true)
  })

  it('releases an owned exact address even when the assignment list omits it', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        addresses: [
          { targetApp: 'tenant-db', network: APP, ip: 'fdaa::12', owned: true, resolved: true },
        ],
      }),
    )
    const double = createFetchDouble()
      .fallback({ body: [] })
      .on('GET /apps/tenant-db/ip_assignments', { body: [] })
      .on('DELETE /apps/tenant-db/ip_assignments/', { status: 204 })

    await expect(makeProvider(double, journal).reconcileCreateAttempts()).resolves.toEqual({
      deleted: 1,
      failed: 0,
    })
    expect(double.matching('DELETE /apps/tenant-db/ip_assignments/fdaa%3A%3A12')).toHaveLength(1)
    expect(journal.attempts.size).toBe(0)
  })

  it('cancels an in-flight create and fences later mutations by generation', async () => {
    const journal = new MemoryJournal()
    const controller = new AbortController()
    const cancelled = createFetchDouble()
      .on(`GET /apps/${APP}`, { body: { name: APP } })
      .on(`POST /apps/${APP}/machines`, { body: { id: 'm1', state: 'started' } })
    const baseFetch = cancelled.fetch
    cancelled.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const response = await baseFetch(input, init)
      if ((init?.method ?? 'GET').toUpperCase() === 'POST') controller.abort(new Error('lock lost'))
      return response
    }) as unknown as typeof fetch
    await expect(
      makeProvider(cancelled, journal).create({ projectId: PROJECT_ID }, controller.signal),
    ).rejects.toThrow('lock lost')
    expect(cancelled.matching(`POST /apps/${APP}/machines`)).toHaveLength(1)

    const fenced = new MemoryJournal()
    const double = createFetchDouble().on(`GET /apps/${APP}`, { body: { name: APP } })
    const originalBegin = fenced.begin.bind(fenced)
    fenced.begin = async (attempt) => {
      await originalBegin(attempt)
      const current = fenced.attempts.get(attempt.attemptId)
      if (current) current.generation = 2
    }
    await expect(makeProvider(double, fenced).create({ projectId: PROJECT_ID })).rejects.toThrow(
      'Stale generation',
    )
    expect(double.calls.filter((call) => call.method === 'POST')).toHaveLength(0)
  })
})

describe('round-eight durable ownership counterexamples', () => {
  it('clears a new volume’s provisional protection when cancellation prevents Machine dispatch', async () => {
    const journal = new MemoryJournal()
    const controller = new AbortController()
    const double = createFetchDouble()
      .fallback({ body: [] })
      .on(`GET /apps/${APP}`, { body: { name: APP } })
      .on(`GET /apps/${APP}/volumes`, { body: [] })
      .on(`POST /apps/${APP}/volumes`, { body: { id: 'v1', name: 'attempt-volume' } })
      .on(`DELETE /apps/${APP}/volumes/v1`, { status: 204 })
    for (let read = 0; read < 12; read++) {
      double.on(`GET /apps/${APP}/volumes`, {
        body: [{ id: 'v1', name: 'attempt-volume', attached_machine_id: null }],
      })
    }
    const markWorkspace = journal.markVolumeWorkspace.bind(journal)
    journal.markVolumeWorkspace = async (attemptId, name, workspace = true) => {
      await markWorkspace(attemptId, name, workspace)
      if (workspace) controller.abort(new Error('advisory connection died'))
    }
    const provider = makeProvider(double, journal, { appPerProject: false, appName: APP })

    await expect(
      provider.create({ projectId: PROJECT_ID, volumeName: 'workspace' }, controller.signal),
    ).rejects.toThrow('advisory connection died')
    expect(double.matching(`POST /apps/${APP}/machines`)).toHaveLength(0)

    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 1, failed: 0 })
    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 0, failed: 0 })
    expect(double.matching(`DELETE /apps/${APP}/volumes/v1`)).toHaveLength(1)
  })

  it('abandons a freshly expired creating attempt under its lock and settles its volume', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        state: 'creating',
        volumes: [{ id: 'v1', name: 'attempt-volume', workspace: false, resolved: true }],
      }),
    )
    journal.reclaimable = async () => {
      const current = journal.attempts.get('attempt-1')
      return current ? [structuredClone(current)] : []
    }
    const double = createFetchDouble()
      .fallback({ body: [] })
      .on(`DELETE /apps/${APP}/volumes/v1`, { status: 204 })
    for (let read = 0; read < 3; read++) {
      double.on(`GET /apps/${APP}/volumes`, {
        body: [{ id: 'v1', name: 'attempt-volume', attached_machine_id: null }],
      })
    }

    await expect(
      makeProvider(double, journal, {
        appPerProject: false,
        appName: APP,
      }).reconcileCreateAttempts(),
    ).resolves.toEqual({ deleted: 1, failed: 0 })
    expect(double.matching(`DELETE /apps/${APP}/volumes/v1`)).toHaveLength(1)
    expect(journal.attempts.size).toBe(0)
  })

  it('deletes a known-ID volume even when a shared-app listing temporarily omits it', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        volumes: [{ id: 'v1', name: 'attempt-volume', workspace: false, resolved: true }],
      }),
    )
    const double = createFetchDouble()
      .fallback({ body: [] })
      .on(`DELETE /apps/${APP}/volumes/v1`, { status: 204 })

    await expect(
      makeProvider(double, journal, {
        appPerProject: false,
        appName: APP,
      }).reconcileCreateAttempts(),
    ).resolves.toEqual({ deleted: 1, failed: 0 })
    expect(double.matching(`DELETE /apps/${APP}/volumes/v1`)).toHaveLength(1)
    expect(journal.attempts.size).toBe(0)
  })

  it('retires a migration-shaped legacy attempt from its sandbox, mounts and routes', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        attemptId: `legacy:${PROJECT_ID}`,
        state: 'serving',
        sandboxId: `${APP}:m1`,
      }),
    )
    const routes = { 'tenant-db': 'fdaa::44' }
    const machine = {
      id: 'm1',
      name: 'original-machine',
      state: 'started',
      config: {
        mounts: [{ volume: 'v1', path: '/workspace' }],
        metadata: {
          'molecule-sandbox.createAttempt': 'original-attempt',
          'molecule-sandbox.volumeName': 'workspace',
          'molecule-sandbox.privateRoutes': encodePrivateRoutes(routes),
        },
      },
    }
    let machineGone = false
    let volumeGone = false
    let addressGone = false
    let appGone = false
    const double = createFetchDouble()
    double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      const url = String(input)
      const path = url.replace('https://api.machines.dev/v1', '')
      double.calls.push({
        method,
        url,
        path,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      })
      let status = 200
      let body: unknown = {}
      if (method === 'GET' && path === `/apps/${APP}/machines`) {
        body = machineGone ? [] : [machine]
      } else if (method === 'GET' && path === `/apps/${APP}/volumes`) {
        body = volumeGone
          ? []
          : [
              {
                id: 'v1',
                name: 'original-volume',
                attached_machine_id: machineGone ? null : 'm1',
              },
            ]
      } else if (method === 'GET' && path === '/apps/tenant-db/ip_assignments') {
        body = addressGone ? [] : [{ ip: 'fdaa::44', network: APP }]
      } else if (method === 'DELETE' && path === `/apps/${APP}/machines/m1?force=true`) {
        machineGone = true
        status = 204
      } else if (method === 'DELETE' && path === `/apps/${APP}/volumes/v1`) {
        volumeGone = true
        status = 204
      } else if (
        method === 'DELETE' &&
        path === `/apps/tenant-db/ip_assignments/${encodeURIComponent('fdaa::44')}`
      ) {
        addressGone = true
        status = 204
      } else if (method === 'DELETE' && path === `/apps/${APP}?force=true`) {
        appGone = true
        status = 204
      } else {
        throw new Error(`Unexpected ${method} ${path}`)
      }
      return {
        status,
        headers: { get: () => null },
        text: async () => JSON.stringify(body),
      } as unknown as Response
    }) as unknown as typeof fetch

    await makeProvider(double, journal).destroyApp(PROJECT_ID)

    expect(machineGone).toBe(true)
    expect(volumeGone).toBe(true)
    expect(addressGone).toBe(true)
    expect(appGone).toBe(true)
    expect(journal.attempts.size).toBe(0)
  })

  it('recovers a lost allocation from Fly’s ips envelope and network object', async () => {
    const journal = new MemoryJournal()
    const double = createFetchDouble()
      .on(`GET /apps/${APP}`, { body: { name: APP } })
      .on('POST /apps/tenant-db/ip_assignments', { body: { ip: 'fdaa::9' } })
      .on('POST /apps/tenant-db/ip_assignments', { status: 422, body: { error: 'taken' } })
      .on('GET /apps/tenant-db/ip_assignments', {
        body: { ips: [{ ip: 'fdaa::9', network: { name: APP, org_slug: 'acme' } }] },
      })
      .on(`POST /apps/${APP}/machines`, { body: { id: 'm1', state: 'started' } })
    const baseFetch = double.fetch
    let first = true
    double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const response = await baseFetch(input, init)
      if (first && (init?.method ?? 'GET').toUpperCase() === 'POST') {
        first = false
        throw new Error('allocation response lost')
      }
      return response
    }) as unknown as typeof fetch

    await makeProvider(double, journal, {
      privateServices: [{ app: 'tenant-db', port: 5432 }],
    }).create({ projectId: PROJECT_ID })
    const attempt = [...journal.attempts.values()].find(
      (candidate) => candidate.state === 'serving',
    )
    expect(attempt?.addresses).toEqual([
      { targetApp: 'tenant-db', network: APP, ip: 'fdaa::9', owned: true, resolved: true },
    ])
  })

  it('settles an owned address from Fly’s ips envelope and network object', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        addresses: [
          { targetApp: 'tenant-db', network: APP, ip: 'fdaa::45', owned: true, resolved: true },
        ],
      }),
    )
    const double = createFetchDouble()
      .fallback({ body: [] })
      .on('GET /apps/tenant-db/ip_assignments', {
        body: { ips: [{ ip: 'fdaa::45', network: { name: APP, org_slug: 'acme' } }] },
      })
      .on('DELETE /apps/tenant-db/ip_assignments/', { status: 204 })

    await expect(
      makeProvider(double, journal, {
        appPerProject: false,
        appName: APP,
      }).reconcileCreateAttempts(),
    ).resolves.toEqual({ deleted: 1, failed: 0 })
    expect(double.matching('DELETE /apps/tenant-db/ip_assignments/fdaa%3A%3A45')).toHaveLength(1)
  })

  it('retries an exact owned-address DELETE with 404 after its accepted response was lost', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        addresses: [
          { targetApp: 'tenant-db', network: APP, ip: 'fdaa::46', owned: true, resolved: true },
        ],
      }),
    )
    const double = createFetchDouble()
      .fallback({ body: [] })
      .on('GET /apps/tenant-db/ip_assignments', {
        body: [{ ip: 'fdaa::46', network: APP }],
      })
      .on('DELETE /apps/tenant-db/ip_assignments/', { status: 404 })
    const baseFetch = double.fetch
    let loseResponses = true
    let lostDeleteAttempts = 0
    double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      if (loseResponses && (init?.method ?? 'GET').toUpperCase() === 'DELETE') {
        lostDeleteAttempts++
        throw new Error('accepted DELETE response lost')
      }
      return baseFetch(input, init)
    }) as unknown as typeof fetch
    const provider = makeProvider(double, journal, { appPerProject: false, appName: APP })

    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 0, failed: 1 })
    expect(journal.attempts.get('attempt-1')?.addresses[0]?.owned).toBe(true)
    loseResponses = false

    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 1, failed: 0 })
    expect(lostDeleteAttempts).toBeGreaterThan(0)
    expect(double.matching('DELETE /apps/tenant-db/ip_assignments/fdaa%3A%3A46')).toHaveLength(1)
    expect(journal.attempts.size).toBe(0)
  })
})

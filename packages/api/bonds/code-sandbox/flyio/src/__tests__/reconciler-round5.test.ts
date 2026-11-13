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
  // Mirror the real t(): the defaultValue (or key) is returned with {{name}}
  // placeholders interpolated from the values argument, so assertions on the
  // thrown English text see what a user would see.
  t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
    const text = opts?.defaultValue ?? key
    if (!values) return text
    return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) => {
      const value = values[name]
      return value === undefined ? match : String(value)
    })
  },
}))

const { FlyApiClient } = await import('../api.js')
const { createProvider } = await import('../provider.js')

const PROJECT_ID = 'a3f1c0de-0000-4000-8000-000000000001'
const APP = `mol-sandbox-${PROJECT_ID}`

class MemoryJournal implements FlyCreateAttemptJournal {
  readonly attempts = new Map<string, FlyCreateAttempt>()
  readonly lockCalls: string[] = []
  createAllowed = true

  async assertCreateAllowed(): Promise<void> {
    if (!this.createAllowed) throw new Error('Fly unsafe-writer rollout fence is closed')
  }

  async begin(
    attempt: Pick<FlyCreateAttempt, 'attemptId' | 'projectId' | 'appName'> & {
      state?: FlyCreateAttemptState
      sandboxId?: string
    },
  ): Promise<void> {
    this.attempts.set(attempt.attemptId, {
      ...attempt,
      state: attempt.state ?? 'creating',
      generation: 1,
      machineCreateOutcome: 'not-started',
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

  async recordAppProvenance(
    attemptId: string,
    generation: number,
    outcome: 'pending' | 'created' | 'adopted',
  ): Promise<void> {
    const attempt = this.attempts.get(attemptId)
    if (!attempt || (attempt.generation ?? 1) !== generation) {
      throw new Error(`Stale generation for ${attemptId}`)
    }
    if (outcome === 'adopted') {
      attempt.appCreatedByAttemptId = undefined
      attempt.appCreateResolved = false
      return
    }
    if (outcome === 'created' && attempt.appCreatedByAttemptId !== attemptId) {
      throw new Error(`Missing app-create intent for ${attemptId}`)
    }
    attempt.appCreatedByAttemptId = attemptId
    attempt.appCreateResolved = outcome === 'created'
  }

  async recordVolume(attemptId: string, volume: FlyCreateVolumeIntent): Promise<void> {
    const attempt = this.attempts.get(attemptId)
    if (!attempt) throw new Error('missing attempt')
    const recorded = {
      ...volume,
      createdByAttemptId: volume.createdByAttemptId === attemptId ? attemptId : undefined,
      adoptedByAttemptId: volume.adoptedByAttemptId === attemptId ? attemptId : undefined,
    }
    if (recorded.id) {
      // Adoption transfers the durable Fly-ID binding; an older attempt keeps
      // no name-only capability that could later delete the workspace.
      for (const other of this.attempts.values()) {
        other.volumes = other.volumes.filter(
          (candidate) =>
            candidate.id !== recorded.id &&
            !(!candidate.id && candidate.name === recorded.name && other.attemptId !== attemptId),
        )
      }
    }
    const index = attempt.volumes.findIndex((candidate) => candidate.name === recorded.name)
    if (index < 0) attempt.volumes.push({ ...recorded })
    else {
      const previous = attempt.volumes[index]
      attempt.volumes[index] = {
        ...recorded,
        workspace: previous.workspace || recorded.workspace,
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

  async markMachineAdopted(attemptId: string): Promise<void> {
    const attempt = this.attempts.get(attemptId)
    if (!attempt) throw new Error('missing attempt')
    attempt.machineAdopted = true
  }

  async recordMachineCreateOutcome(
    attemptId: string,
    generation: number,
    outcome: 'pending' | 'unknown',
  ): Promise<void> {
    const attempt = this.attempts.get(attemptId)
    if (!attempt || (attempt.generation ?? 1) !== generation) {
      throw new Error(`Stale generation for ${attemptId}`)
    }
    attempt.machineCreateOutcome = outcome
  }

  async recordMachineObservation(
    attemptId: string,
    generation: number,
    machineId: string,
  ): Promise<void> {
    const attempt = this.attempts.get(attemptId)
    if (
      !attempt ||
      (attempt.generation ?? 1) !== generation ||
      (attempt.machineId !== undefined && attempt.machineId !== machineId)
    ) {
      throw new Error(`Stale or conflicting Machine observation for ${attemptId}`)
    }
    attempt.machineId = machineId
    attempt.machineCreatedByAttemptId = undefined
    attempt.machineCreateOutcome = 'unknown'
  }

  async recordMachineProvenance(
    attemptId: string,
    generation: number,
    machineId: string,
  ): Promise<void> {
    const attempt = this.attempts.get(attemptId)
    if (!attempt || (attempt.generation ?? 1) !== generation) {
      throw new Error(`Stale generation for ${attemptId}`)
    }
    attempt.machineId = machineId
    attempt.machineCreatedByAttemptId = attemptId
    attempt.machineCreateOutcome = 'accepted'
  }

  async markMachineCreateFailed(attemptId: string, generation: number): Promise<void> {
    const attempt = this.attempts.get(attemptId)
    if (!attempt || (attempt.generation ?? 1) !== generation) {
      throw new Error(`Stale generation for ${attemptId}`)
    }
    attempt.machineCreateFailed = true
    attempt.machineCreateOutcome = 'rejected'
  }

  async assertGeneration(attemptId: string, generation: number): Promise<void> {
    const attempt = this.attempts.get(attemptId)
    if (!attempt || (attempt.generation ?? 1) !== generation) {
      throw new Error(`Stale generation for ${attemptId}`)
    }
  }

  async retire(attemptId: string, generation: number): Promise<void> {
    const attempt = this.attempts.get(attemptId)
    if (!attempt || (attempt.generation ?? 1) !== generation) {
      throw new Error(`Stale generation for ${attemptId}`)
    }
    attempt.state = 'abandoned'
  }

  async authorizeDestruction(attemptId: string, generation: number): Promise<void> {
    const attempt = this.attempts.get(attemptId)
    if (!attempt || (attempt.generation ?? 1) !== generation || attempt.state !== 'abandoned') {
      throw new Error(`Retired generation for ${attemptId} is not authorized`)
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

  async forget(attemptId: string, generation?: number): Promise<void> {
    const attempt = this.attempts.get(attemptId)
    if (
      generation !== undefined &&
      (!attempt || (attempt.generation ?? 1) !== generation || attempt.state !== 'abandoned')
    ) {
      throw new Error(`Retired generation for ${attemptId} cannot be forgotten`)
    }
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
    machineCreateOutcome: 'not-started',
    volumes: [],
    addresses: [],
    ...overrides,
  }
}

interface RouteRequestBody {
  name?: string
  config?: Record<string, unknown>
}

function installRoutes(
  double: ReturnType<typeof createFetchDouble>,
  route: (
    method: string,
    path: string,
    body: RouteRequestBody,
  ) => Promise<{ status?: number; body?: unknown }> | { status?: number; body?: unknown },
): void {
  double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase()
    const path = String(input).replace('https://api.machines.dev/v1', '')
    const body = init?.body ? (JSON.parse(String(init.body)) as RouteRequestBody) : {}
    double.calls.push({ method, path, url: String(input), body })
    const response = await route(method, path, body)
    return {
      status: response.status ?? 200,
      headers: { get: () => null },
      text: async () => JSON.stringify(response.body ?? {}),
    } as unknown as Response
  }) as unknown as typeof fetch
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

  it('retains an unresolved workspace volume for reuse instead of inferring deletion', async () => {
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
    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 0, failed: 1 })
    expect(double.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
    expect(double.matching(`POST /apps/${APP}/volumes`)).toHaveLength(1)
    expect(journal.attempts.size).toBe(1)
  })

  it('records failure, keeps the empty app, then deliberately retires it', async () => {
    const double = createFetchDouble()
      .on(`GET /apps/${APP}`, { status: 404 })
      .on('POST /apps', { body: { name: APP } })
      .on(`POST /apps/${APP}/machines`, { status: 422, body: { error: 'invalid' } })
    for (let read = 0; read < 20; read++) {
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

    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 0, failed: 1 })
    expect(double.matching(`DELETE /apps/${APP}`)).toHaveLength(0)
    expect(journal.attempts.size).toBe(1)

    await provider.destroyApp(PROJECT_ID, APP, new AbortController().signal)
    expect(double.matching(`DELETE /apps/${APP}`)).toHaveLength(1)
    expect(journal.attempts.size).toBe(0)
    expect(journal.lockCalls).toEqual([APP, APP, APP])
  })

  it('keeps an abandoned volume resolved only from a listing, and never a bound workspace', async () => {
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
      deleted: 0,
      failed: 1,
    })
    expect(unboundDouble.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
    expect(unbound.attempts.size).toBe(1)

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
      failed: 1,
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

    await makeProvider(double, journal).destroy(`${APP}:m1`, new AbortController().signal)

    expect(double.matching(`DELETE /apps/${APP}/machines/m1`)).toHaveLength(1)
    expect(
      double.calls.filter((call) => call.method === 'DELETE' && call.path === `/apps/${APP}`),
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
      failed: 1,
    })
    expect(double.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
    expect(journal.attempts.size).toBe(1)
  })

  it('releases recorded addresses before forgetting, and retains unresolved ownership', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        appCreatedByAttemptId: 'attempt-1',
        appCreateResolved: true,
        addresses: [
          { targetApp: 'tenant-db', network: APP, ip: 'fdaa::2', owned: true, resolved: true },
        ],
      }),
    )
    const double = createFetchDouble()
    for (let read = 0; read < 20; read++) {
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

    const provider = makeProvider(double, journal)
    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 0, failed: 0 })
    expect(journal.attempts.size).toBe(1)
    await provider.destroyApp(PROJECT_ID, APP, new AbortController().signal)
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

  it.each([
    ['per-project-app', {}],
    ['shared-app', { appPerProject: false, appName: APP }],
  ])(
    'sweeps a definite 412 Machine rejection in %s mode, then is idempotent',
    async (_mode, config) => {
      const journal = new MemoryJournal()
      const double = createFetchDouble()
      let volumeCreated = false
      let volumeGone = false
      let appCreated = false
      let appGone = false
      double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const method = (init?.method ?? 'GET').toUpperCase()
        const path = String(input).replace('https://api.machines.dev/v1', '')
        double.calls.push({ method, url: String(input), path, body: undefined })
        let status = 200
        let body: unknown = {}
        if (method === 'GET' && path === `/apps/${APP}`) {
          if (!appCreated || appGone) status = 404
          else body = { name: APP }
        } else if (method === 'POST' && path === '/apps') {
          appCreated = true
          body = { name: APP }
        } else if (method === 'GET' && path === `/apps/${APP}/volumes`) {
          body = volumeCreated && !volumeGone ? [{ id: 'v1', name: 'attempt-volume' }] : []
        } else if (method === 'POST' && path === `/apps/${APP}/volumes`) {
          volumeCreated = true
          body = { id: 'v1', name: 'attempt-volume' }
        } else if (method === 'GET' && path === `/apps/${APP}/machines`) {
          body = []
        } else if (method === 'POST' && path === `/apps/${APP}/machines`) {
          status = 412
          body = { error: 'failed_precondition: definite rejection' }
        } else if (method === 'DELETE' && path === `/apps/${APP}/volumes/v1`) {
          volumeGone = true
          status = 204
        } else if (method === 'DELETE' && path === `/apps/${APP}`) {
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
      const provider = makeProvider(double, journal, config)

      await expect(
        provider.create({ projectId: PROJECT_ID, volumeName: 'workspace' }),
      ).rejects.toThrow('412')
      const attempt = [...journal.attempts.values()].find(
        (candidate) => candidate.state === 'failed',
      )
      expect(attempt?.volumes[0]).toMatchObject({
        id: 'v1',
        workspace: true,
        resolved: true,
        createdByAttemptId: attempt?.attemptId,
      })
      expect(attempt).toMatchObject({
        appCreatedByAttemptId: attempt?.attemptId,
        appCreateResolved: true,
      })

      const perProject = config.appPerProject !== false
      if (perProject) {
        await expect(provider.reconcileCreateAttempts()).resolves.toEqual({
          deleted: 0,
          failed: 1,
        })
        expect(
          double.calls.filter((call) => call.method === 'DELETE' && call.path === `/apps/${APP}`),
        ).toHaveLength(0)
        expect(journal.attempts.size).toBe(1)
        await provider.destroyApp(PROJECT_ID, APP, new AbortController().signal)
      } else {
        await expect(provider.reconcileCreateAttempts()).resolves.toEqual({
          deleted: 1,
          failed: 0,
        })
      }
      await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 0, failed: 0 })
      expect(double.matching(`DELETE /apps/${APP}/volumes/v1`).length).toBeGreaterThan(0)
      expect(
        double.calls.filter((call) => call.method === 'DELETE' && call.path === `/apps/${APP}`),
      ).toHaveLength(config.appPerProject === false ? 0 : 1)
      expect(double.matching(`DELETE /apps/${APP}?force=true`)).toHaveLength(0)
      expect(journal.attempts.size).toBe(0)
    },
  )

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

    await expect(
      makeProvider(double, journal).destroyApp(PROJECT_ID, undefined, new AbortController().signal),
    ).rejects.toThrow('500')
    expect(double.matching(`DELETE /apps/${APP}`)).toHaveLength(0)
    expect(journal.attempts.size).toBe(1)

    await makeProvider(double, journal).destroyApp(
      PROJECT_ID,
      undefined,
      new AbortController().signal,
    )
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
        appCreatedByAttemptId: 'attempt-1',
        appCreateResolved: true,
        addresses: [
          { targetApp: 'tenant-db', network: APP, ip: 'fdaa::12', owned: true, resolved: true },
        ],
      }),
    )
    const double = createFetchDouble()
      .fallback({ body: [] })
      .on('GET /apps/tenant-db/ip_assignments', { body: [] })
      .on('DELETE /apps/tenant-db/ip_assignments/', { status: 204 })

    const provider = makeProvider(double, journal)
    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({
      deleted: 0,
      failed: 0,
    })
    expect(double.matching(`DELETE /apps/${APP}`)).toHaveLength(0)
    expect(journal.attempts.size).toBe(1)
    await provider.destroyApp(PROJECT_ID, APP, new AbortController().signal)
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
  it('keeps a workspace volume owned when cancellation prevents Machine dispatch', async () => {
    const journal = new MemoryJournal()
    const controller = new AbortController()
    const double = createFetchDouble()
      .fallback({ body: [] })
      .on(`GET /apps/${APP}`, { body: { name: APP } })
      .on(`GET /apps/${APP}/volumes`, { body: [] })
      .on(`POST /apps/${APP}/volumes`, { body: { id: 'v1', name: 'attempt-volume' } })
    const assertGeneration = journal.assertGeneration.bind(journal)
    let fences = 0
    journal.assertGeneration = async (attemptId, generation) => {
      if (++fences === 3) controller.abort(new Error('advisory connection died'))
      return assertGeneration(attemptId, generation)
    }
    const provider = makeProvider(double, journal, { appPerProject: false, appName: APP })

    await expect(
      provider.create({ projectId: PROJECT_ID, volumeName: 'workspace' }, controller.signal),
    ).rejects.toThrow('advisory connection died')
    expect(double.matching(`POST /apps/${APP}/machines`)).toHaveLength(0)

    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 0, failed: 0 })
    expect(double.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
    expect([...journal.attempts.values()][0]?.volumes[0]?.workspace).toBe(true)
  })

  it('abandons a freshly expired creating attempt under its lock and settles its volume', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        state: 'creating',
        volumes: [
          {
            id: 'v1',
            name: 'attempt-volume',
            workspace: false,
            resolved: true,
            createdByAttemptId: 'attempt-1',
          },
        ],
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
        volumes: [
          {
            id: 'v1',
            name: 'attempt-volume',
            workspace: false,
            resolved: true,
            createdByAttemptId: 'attempt-1',
          },
        ],
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
      } else if (method === 'DELETE' && path === `/apps/${APP}`) {
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

    await makeProvider(double, journal).destroyApp(
      PROJECT_ID,
      undefined,
      new AbortController().signal,
    )

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

describe('round-ten ownership counterexamples', () => {
  it('retains per-project workspace ownership when lock loss prevents Machine dispatch', async () => {
    const journal = new MemoryJournal()
    const controller = new AbortController()
    const double = createFetchDouble()
      .fallback({ body: [] })
      .on(`GET /apps/${APP}`, { body: { name: APP } })
      .on(`GET /apps/${APP}/volumes`, { body: [] })
      .on(`POST /apps/${APP}/volumes`, { body: { id: 'v1', name: 'attempt-volume' } })
    const assertGeneration = journal.assertGeneration.bind(journal)
    let fences = 0
    journal.assertGeneration = async (attemptId, generation) => {
      if (++fences === 3) controller.abort(new Error('lock lost before Machine dispatch'))
      return assertGeneration(attemptId, generation)
    }
    const provider = makeProvider(double, journal)

    await expect(
      provider.create({ projectId: PROJECT_ID, volumeName: 'workspace' }, controller.signal),
    ).rejects.toThrow('lock lost before Machine dispatch')
    expect(double.matching(`POST /apps/${APP}/machines`)).toHaveLength(0)

    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 0, failed: 0 })
    expect(double.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
    expect([...journal.attempts.values()][0]?.volumes[0]?.workspace).toBe(true)
  })

  it('journals initially observed legacy routes before later listings omit the Machine', async () => {
    const attemptId = `legacy:${PROJECT_ID}`
    const journal = new MemoryJournal()
    journal.seed(failedIntent({ attemptId, state: 'serving', sandboxId: `${APP}:m1` }))
    const routes = { 'tenant-db': 'fdaa::47' }
    const machine = {
      id: 'm1',
      name: 'original-machine',
      state: 'started',
      config: {
        metadata: {
          'molecule-sandbox.privateRoutes': encodePrivateRoutes(routes),
        },
      },
    }
    let firstMachineListing = true
    const double = createFetchDouble()
    double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      const url = String(input)
      const path = url.replace('https://api.machines.dev/v1', '')
      double.calls.push({ method, url, path, body: undefined })
      let status = 200
      let body: unknown = {}
      if (method === 'GET' && path === `/apps/${APP}/machines`) {
        body = firstMachineListing ? [machine] : []
        firstMachineListing = false
      } else if (method === 'GET' && path === `/apps/${APP}/volumes`) {
        body = []
      } else if (method === 'GET' && path === '/apps/tenant-db/ip_assignments') {
        body = [{ ip: 'fdaa::47', network: APP }]
      } else if (
        method === 'DELETE' &&
        path === `/apps/tenant-db/ip_assignments/${encodeURIComponent('fdaa::47')}`
      ) {
        status = 204
      } else if (method === 'DELETE' && path === `/apps/${APP}`) {
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

    await makeProvider(double, journal).destroyApp(
      PROJECT_ID,
      undefined,
      new AbortController().signal,
    )

    const deletes = double.calls.filter((call) => call.method === 'DELETE').map((call) => call.path)
    expect(deletes).toEqual([
      `/apps/tenant-db/ip_assignments/${encodeURIComponent('fdaa::47')}`,
      `/apps/${APP}`,
    ])
    expect(journal.attempts.size).toBe(0)
  })

  it('settles a resolved owned IP when its target app assignment listing is gone', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        addresses: [
          { targetApp: 'tenant-db', network: APP, ip: 'fdaa::48', owned: true, resolved: true },
        ],
      }),
    )
    const double = createFetchDouble()
      .fallback({ body: [] })
      .on('GET /apps/tenant-db/ip_assignments', { status: 404, body: { error: 'app gone' } })
      .on('DELETE /apps/tenant-db/ip_assignments/fdaa%3A%3A48', { status: 204 })

    await expect(
      makeProvider(double, journal, {
        appPerProject: false,
        appName: APP,
      }).reconcileCreateAttempts(),
    ).resolves.toEqual({ deleted: 1, failed: 0 })
    expect(double.matching('GET /apps/tenant-db/ip_assignments')).toHaveLength(0)
    expect(double.matching('DELETE /apps/tenant-db/ip_assignments/fdaa%3A%3A48')).toHaveLength(1)
    expect(journal.attempts.size).toBe(0)
  })
})

describe('round-twelve destruction fencing counterexamples', () => {
  it('stops the legacy fallback when its lock is lost during the Machine GET', async () => {
    const controller = new AbortController()
    const lockLoss = new Error('lock lost during legacy Machine GET')
    const double = createFetchDouble()
    const baseFetch = double.fetch
    double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const response = await baseFetch(input, init)
      if (
        (init?.method ?? 'GET').toUpperCase() === 'GET' &&
        String(input).endsWith(`/apps/${APP}/machines/m1`)
      ) {
        controller.abort(lockLoss)
      }
      return response
    }) as unknown as typeof fetch

    await expect(makeProvider(double).destroy(`${APP}:m1`, controller.signal)).rejects.toBe(
      lockLoss,
    )
    expect(double.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
  })

  it('does not abandon or delete a shared-app serving attempt after forApp loses the lock', async () => {
    const journal = new MemoryJournal()
    const attemptId = 'serving-shared'
    journal.seed(
      failedIntent({
        attemptId,
        state: 'serving',
        sandboxId: `${APP}:m1`,
        volumes: [
          {
            id: 'v1',
            name: 'attempt-volume',
            workspace: false,
            resolved: true,
            createdByAttemptId: 'attempt-1',
          },
        ],
      }),
    )
    const controller = new AbortController()
    const lockLoss = new Error('lock lost during forApp')
    const forApp = journal.forApp.bind(journal)
    journal.forApp = async (appName) => {
      const attempts = await forApp(appName)
      controller.abort(lockLoss)
      return attempts
    }
    const double = createFetchDouble().fallback({ body: [] })

    await expect(
      makeProvider(double, journal, { appPerProject: false, appName: APP }).destroy(
        `${APP}:m1`,
        controller.signal,
      ),
    ).rejects.toBe(lockLoss)
    expect(journal.attempts.get(attemptId)?.state).toBe('serving')
    expect(double.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
  })

  it('does not abandon a per-project serving app after forApp loses the lock', async () => {
    const journal = new MemoryJournal()
    const attemptId = `legacy:${PROJECT_ID}`
    journal.seed(failedIntent({ attemptId, state: 'serving', sandboxId: `${APP}:m1` }))
    const controller = new AbortController()
    const lockLoss = new Error('lock lost during app retirement journal read')
    const forApp = journal.forApp.bind(journal)
    journal.forApp = async (appName) => {
      const attempts = await forApp(appName)
      controller.abort(lockLoss)
      return attempts
    }
    const double = createFetchDouble().fallback({ body: [] })

    await expect(
      makeProvider(double, journal).destroyApp(PROJECT_ID, undefined, controller.signal),
    ).rejects.toBe(lockLoss)
    expect(journal.attempts.get(attemptId)?.state).toBe('serving')
    expect(double.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
  })

  it('settles destroy() from its initially observed legacy routes, not a later empty listing', async () => {
    const attemptId = `legacy:${PROJECT_ID}`
    const journal = new MemoryJournal()
    journal.seed(failedIntent({ attemptId, state: 'serving', sandboxId: `${APP}:m1` }))
    const routes = { 'tenant-db': 'fdaa::49' }
    const observedMachine = {
      id: 'm1',
      name: 'original-machine',
      state: 'started',
      config: {
        mounts: [{ volume: 'v1', path: '/workspace' }],
        metadata: {
          'molecule-sandbox.volumeName': 'workspace',
          'molecule-sandbox.privateRoutes': encodePrivateRoutes(routes),
        },
      },
    }
    let volumeGone = false
    const double = createFetchDouble()
    double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      const url = String(input)
      const path = url.replace('https://api.machines.dev/v1', '')
      double.calls.push({ method, url, path, body: undefined })
      let status = 200
      let body: unknown = {}
      if (method === 'GET' && path === `/apps/${APP}/machines/m1`) {
        body = observedMachine
      } else if (method === 'GET' && path === `/apps/${APP}/machines`) {
        body = []
      } else if (method === 'GET' && path === `/apps/${APP}/volumes`) {
        body = volumeGone ? [] : [{ id: 'v1', name: 'original-volume', attached_machine_id: null }]
      } else if (method === 'GET' && path === '/apps/tenant-db/ip_assignments') {
        body = [{ ip: 'fdaa::49', network: APP }]
      } else if (method === 'DELETE' && path === `/apps/${APP}/volumes/v1`) {
        volumeGone = true
        status = 204
      } else if (
        method === 'DELETE' &&
        path === `/apps/tenant-db/ip_assignments/${encodeURIComponent('fdaa::49')}`
      ) {
        status = 204
      } else if (method === 'DELETE' && path === `/apps/${APP}`) {
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

    await makeProvider(double, journal).destroy(`${APP}:m1`, new AbortController().signal)

    const deletes = double.calls.filter((call) => call.method === 'DELETE').map((call) => call.path)
    expect(deletes).toContain(`/apps/tenant-db/ip_assignments/${encodeURIComponent('fdaa::49')}`)
    expect(
      deletes.indexOf(`/apps/tenant-db/ip_assignments/${encodeURIComponent('fdaa::49')}`),
    ).toBeLessThan(deletes.indexOf(`/apps/${APP}`))
    expect(journal.attempts.size).toBe(0)
  })

  it('retains crash-shaped workspace ownership for an explicit sweep or reuse', async () => {
    const journal = new MemoryJournal()
    const attempt = failedIntent({
      volumes: [
        {
          id: 'v1',
          name: 'attempt-volume',
          workspace: true,
          resolved: true,
        },
      ],
    } as Partial<FlyCreateAttempt>)
    journal.seed(attempt)
    let volumeGone = false
    const double = createFetchDouble()
    double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      const url = String(input)
      const path = url.replace('https://api.machines.dev/v1', '')
      double.calls.push({ method, url, path, body: undefined })
      let status = 200
      let body: unknown = []
      if (method === 'DELETE' && path === `/apps/${APP}/volumes/v1`) {
        volumeGone = true
        status = 204
        body = {}
      } else if (method === 'GET' && path === `/apps/${APP}/volumes` && !volumeGone) {
        body = [{ id: 'v1', name: 'attempt-volume', attached_machine_id: null }]
      } else if (method !== 'GET' && !(method === 'DELETE' && path === `/apps/${APP}/volumes/v1`)) {
        throw new Error(`Unexpected ${method} ${path}`)
      }
      return {
        status,
        headers: { get: () => null },
        text: async () => JSON.stringify(body),
      } as unknown as Response
    }) as unknown as typeof fetch

    await expect(
      makeProvider(double, journal, {
        appPerProject: false,
        appName: APP,
      }).reconcileCreateAttempts(),
    ).resolves.toEqual({ deleted: 0, failed: 1 })
    expect(double.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
    expect(journal.attempts.size).toBe(1)
  })

  it('keeps workspace ownership durable when fetch is never entered', async () => {
    const journal = new MemoryJournal()
    const transportRefusal = new Error('fetch entry refused')
    const double = createFetchDouble()
      .on(`GET /apps/${APP}`, { body: { name: APP } })
      .on(`GET /apps/${APP}/volumes`, { body: [] })
      .on(`POST /apps/${APP}/volumes`, { body: { id: 'v1', name: 'attempt-volume' } })
    for (let read = 0; read < 16; read++) {
      double.on(`GET /apps/${APP}/machines`, { body: [] })
    }
    const baseFetch = double.fetch
    double.fetch = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      if ((init?.method ?? 'GET').toUpperCase() === 'POST') {
        const path = String(input)
        if (path.endsWith(`/apps/${APP}/machines`)) throw transportRefusal
      }
      return baseFetch(input, init)
    }) as unknown as typeof fetch

    await expect(
      makeProvider(double, journal).create({ projectId: PROJECT_ID, volumeName: 'workspace' }),
    ).rejects.toThrow('unknown outcome')
    const attempt = [...journal.attempts.values()][0]
    expect(attempt?.volumes[0]).toMatchObject({ workspace: true })
  })

  it('keeps a dispatched workspace when the attempt never reaches serving', async () => {
    const journal = new MemoryJournal()
    const double = createFetchDouble()
      .on(`GET /apps/${APP}`, { body: { name: APP, network: APP } })
      .on(`GET /apps/${APP}/volumes`, { body: [] })
      .on(`POST /apps/${APP}/volumes`, { body: { id: 'v1', name: 'attempt-volume' } })
      .on(`POST /apps/${APP}/machines`, { body: { id: 'm1', state: 'created' } })
    const provider = makeProvider(double, journal)

    await expect(
      provider.create({ projectId: PROJECT_ID, volumeName: 'workspace' }),
    ).resolves.toMatchObject({ id: `${APP}:m1` })
    expect(double.matching(`POST /apps/${APP}/machines`)).toHaveLength(1)
    const attempt = [...journal.attempts.values()][0]
    expect(attempt?.volumes[0]).toMatchObject({ workspace: true })

    // Replay Sol 1's crash-shaped state: the POST landed, but serving did not.
    attempt!.state = 'failed'
    double.fallback({ body: [] })
    await provider.reconcileCreateAttempts()

    expect(double.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
    expect(attempt?.volumes[0]?.workspace).toBe(true)
  })

  it.each([
    ['shared-app', { appPerProject: false, appName: APP }],
    ['per-project-app', {}],
  ])(
    'does not abandon a serving %s attempt when its lock dies during SQL',
    async (_mode, config) => {
      let started!: () => void
      let released!: () => void
      const entered = new Promise<void>((resolve) => {
        started = resolve
      })
      const release = new Promise<void>((resolve) => {
        released = resolve
      })
      const controller = new AbortController()
      const lockLoss = new Error('lock connection lost during retirement UPDATE')

      class BlockingRetirementJournal extends MemoryJournal {
        override async withLock<T>(
          attempt: FlyCreateAttempt,
          body: (signal: AbortSignal, generation: number) => Promise<T>,
        ): Promise<T> {
          const current = this.attempts.get(attempt.attemptId)
          if (!current) throw new Error('missing attempt')
          current.generation = (current.generation ?? 1) + 1
          return body(controller.signal, current.generation)
        }

        override async markState(
          attemptId: string,
          state: FlyCreateAttemptState,
          sandboxId?: string,
        ): Promise<void> {
          if (state !== 'abandoned') return super.markState(attemptId, state, sandboxId)
          // Old pooled behavior: the serving row commits before the lock-loss
          // notification and the post-write signal check can no longer undo it.
          await super.markState(attemptId, state, sandboxId)
          started()
          await release
        }

        override async retire(attemptId: string, generation: number): Promise<void> {
          started()
          await release
          if (controller.signal.aborted) throw controller.signal.reason
          return super.retire(attemptId, generation)
        }
      }

      const journal = new BlockingRetirementJournal()
      journal.seed(
        failedIntent({
          state: 'serving',
          sandboxId: `${APP}:m1`,
        }),
      )
      const double = createFetchDouble().on(`GET /apps/${APP}/machines/m1`, {
        status: 404,
        body: { error: 'not found' },
      })
      const destroying = makeProvider(double, journal, config).destroy(
        `${APP}:m1`,
        controller.signal,
      )
      await entered
      controller.abort(lockLoss)
      released()

      await expect(destroying).rejects.toBe(lockLoss)
      expect(journal.attempts.get('attempt-1')?.state).toBe('serving')
    },
  )

  it('settles a journaled legacy Machine route after an accepted DELETE loses the lock', async () => {
    const journal = new MemoryJournal()
    const controller = new AbortController()
    const lockLoss = new Error('lock lost after accepted legacy Machine DELETE')
    const machine = {
      id: 'm1',
      state: 'stopped',
      config: {
        metadata: {
          [`molecule-sandbox.projectId`]: PROJECT_ID,
          [`molecule-sandbox.privateRoutes`]: encodePrivateRoutes({ 'tenant-db': 'fdaa::1' }),
        },
      },
    }
    const double = createFetchDouble()
      .fallback({ body: [] })
      .on('GET /apps/tenant-db/ip_assignments', {
        body: [{ ip: 'fdaa::1', network: APP }],
      })
      .on(`GET /apps/${APP}/machines/m1`, { body: machine })
      .on(`GET /apps/${APP}/machines/m1`, { status: 404, body: { error: 'gone' } })
    double
      .on(`GET /apps/${APP}/machines`, { body: [machine] })
      .on(`GET /apps/${APP}/machines`, { body: [machine] })
    const baseFetch = double.fetch
    let loseLock = true
    double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const response = await baseFetch(input, init)
      const method = (init?.method ?? 'GET').toUpperCase()
      if (loseLock && method === 'DELETE' && String(input).includes(`/machines/m1`)) {
        loseLock = false
        controller.abort(lockLoss)
      }
      return response
    }) as unknown as typeof fetch
    const provider = makeProvider(double, journal)

    await expect(provider.destroy(`${APP}:m1`, controller.signal)).rejects.toBe(lockLoss)
    expect([...journal.attempts.values()][0]?.addresses).toEqual([
      { targetApp: 'tenant-db', network: APP, ip: 'fdaa::1', owned: true, resolved: true },
    ])

    await provider.destroy(`${APP}:m1`, new AbortController().signal)

    const routeDeletes = double.matching('DELETE /apps/tenant-db/ip_assignments/fdaa%3A%3A1')
    expect(routeDeletes).toHaveLength(1)
    expect(
      double.calls.filter((call) => call.method === 'DELETE' && call.path === `/apps/${APP}`),
    ).toHaveLength(1)
    expect(double.calls.findIndex((call) => call === routeDeletes[0])).toBeLessThan(
      double.calls.findIndex((call) => call.method === 'DELETE' && call.path === `/apps/${APP}`),
    )
    expect(journal.attempts.size).toBe(0)
  })
})

describe('round-fourteen failed-create sweep and legacy recovery', () => {
  it('keeps an adopted workspace while a previous attempt still serves', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        attemptId: 'previous-serving',
        state: 'serving',
        sandboxId: `${APP}:old-machine`,
        volumes: [
          {
            id: 'v1',
            name: 'original-workspace',
            logicalName: 'workspace',
            workspace: true,
            resolved: true,
          },
        ],
      }),
    )
    const double = createFetchDouble()
    let volumeGone = false
    double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      const path = String(input).replace('https://api.machines.dev/v1', '')
      double.calls.push({ method, url: String(input), path, body: undefined })
      let status = 200
      let body: unknown = {}
      if (method === 'GET' && path === `/apps/${APP}`) {
        body = { name: APP }
      } else if (method === 'GET' && path === `/apps/${APP}/volumes`) {
        body = volumeGone ? [] : [{ id: 'v1', name: 'original-workspace' }]
      } else if (method === 'GET' && path === `/apps/${APP}/machines`) {
        body = []
      } else if (method === 'POST' && path === `/apps/${APP}/machines`) {
        status = 412
        body = { error: 'failed_precondition: definite rejection' }
      } else if (method === 'DELETE' && path === `/apps/${APP}/volumes/v1`) {
        volumeGone = true
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
    const provider = makeProvider(double, journal)

    await expect(
      provider.create({ projectId: PROJECT_ID, volumeName: 'workspace' }),
    ).rejects.toThrow('412')
    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 0, failed: 1 })
    expect(double.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
    expect(volumeGone).toBe(false)
  })

  it('keeps and reports a shared-app volume still referenced by another Machine', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        machineCreateFailed: true,
        volumes: [{ id: 'v1', name: 'attempt-volume', workspace: true, resolved: true }],
      } as Partial<FlyCreateAttempt>),
    )
    const otherMachine = {
      id: 'm-other',
      state: 'started',
      config: { mounts: [{ volume: 'v1', path: '/workspace' }] },
    }
    const double = createFetchDouble()
      .fallback({ body: [] })
      .on(`GET /apps/${APP}/machines`, { body: [otherMachine] })
      .on(`GET /apps/${APP}/machines`, { body: [otherMachine] })
      .on(`GET /apps/${APP}/volumes`, {
        body: [{ id: 'v1', name: 'attempt-volume', attached_machine_id: 'm-other' }],
      })
      .on(`GET /apps/${APP}/volumes`, {
        body: [{ id: 'v1', name: 'attempt-volume', attached_machine_id: 'm-other' }],
      })

    await expect(
      makeProvider(double, journal, {
        appPerProject: false,
        appName: APP,
      }).reconcileCreateAttempts(),
    ).resolves.toEqual({ deleted: 0, failed: 1 })
    expect(double.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
    expect(journal.attempts.get('attempt-1')?.volumes).toHaveLength(1)
  })

  it('does not sweep a volume a later create adopted before reconciliation', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        machineCreateFailed: true,
        volumes: [
          {
            id: 'v1',
            name: 'old-attempt-volume',
            logicalName: 'workspace',
            workspace: true,
            resolved: true,
          },
        ],
      } as Partial<FlyCreateAttempt>),
    )
    const double = createFetchDouble()
    let machine: Record<string, unknown> | null = null
    double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      const path = String(input).replace('https://api.machines.dev/v1', '')
      double.calls.push({ method, url: String(input), path, body: undefined })
      let status = 200
      let body: unknown = {}
      if (method === 'GET' && path === `/apps/${APP}`) {
        body = { name: APP }
      } else if (method === 'GET' && path === `/apps/${APP}/volumes`) {
        body = [{ id: 'v1', name: 'old-attempt-volume', attached_machine_id: null }]
      } else if (method === 'POST' && path === `/apps/${APP}/machines`) {
        const request = JSON.parse(String(init?.body)) as { config: Record<string, unknown> }
        machine = { id: 'm2', state: 'started', config: request.config }
        body = machine
      } else if (method === 'GET' && path === `/apps/${APP}/machines`) {
        body = machine ? [machine] : []
      } else if (method === 'GET' && path.startsWith(`/apps/${APP}/machines/m2/wait`)) {
        body = { ...machine, state: 'started' }
      } else if (method === 'DELETE') {
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
    const provider = makeProvider(double, journal)

    await expect(
      provider.create({ projectId: PROJECT_ID, volumeName: 'workspace' }),
    ).resolves.toMatchObject({ id: `${APP}:m2` })
    const oldAttempt = journal.attempts.get('attempt-1')
    expect(oldAttempt?.volumes).toHaveLength(0)

    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 0, failed: 1 })
    expect(double.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
    expect(journal.attempts.get('attempt-1')).toBeDefined()
    expect([...journal.attempts.values()].some((attempt) => attempt.state === 'serving')).toBe(true)
  })

  it('repairs a crash-incomplete legacy adoption, then destroys it without an earlier DELETE', async () => {
    const attemptId = `legacy:${APP}:m1`
    const journal = new MemoryJournal()
    journal.seed(failedIntent({ attemptId, state: 'creating' }))
    const machine = {
      id: 'm1',
      name: 'pre-journal-machine',
      state: 'started',
      config: { metadata: { 'molecule-sandbox.projectId': PROJECT_ID } },
    }
    let machineGone = false
    const double = createFetchDouble()
    double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      const path = String(input).replace('https://api.machines.dev/v1', '')
      double.calls.push({ method, url: String(input), path, body: undefined })
      let status = 200
      let body: unknown = {}
      if (method === 'GET' && path === `/apps/${APP}/machines/m1`) {
        body = machine
      } else if (method === 'GET' && path === `/apps/${APP}/machines`) {
        body = machineGone ? [] : [machine]
      } else if (method === 'GET' && path === `/apps/${APP}/volumes`) {
        body = []
      } else if (method === 'DELETE' && path === `/apps/${APP}/machines/m1?force=true`) {
        machineGone = true
        status = 204
      } else if (method === 'DELETE' && path === `/apps/${APP}`) {
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

    expect(double.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)
    await makeProvider(double, journal).destroy(`${APP}:m1`, new AbortController().signal)

    expect(double.matching(`DELETE /apps/${APP}/machines/m1?force=true`)).toHaveLength(1)
    expect(
      double.calls.filter((call) => call.method === 'DELETE' && call.path === `/apps/${APP}`),
    ).toHaveLength(1)
    expect(journal.attempts.size).toBe(0)
  })
})

describe('round-fifteen recorded provenance and legacy adoption', () => {
  it.each(['journaled', 'legacy'])(
    'keeps an adopted %s user workspace when the replacement POST is rejected',
    async (kind) => {
      const journal = new MemoryJournal()
      if (kind === 'journaled') {
        journal.seed(
          failedIntent({
            attemptId: 'old-serving',
            state: 'serving',
            sandboxId: `${APP}:old-machine`,
            volumes: [
              {
                id: 'user-data',
                name: 'workspace',
                logicalName: 'workspace',
                workspace: true,
                resolved: true,
              },
            ],
          }),
        )
      }
      const double = createFetchDouble()
      let volumeExists = true
      double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const method = (init?.method ?? 'GET').toUpperCase()
        const path = String(input).replace('https://api.machines.dev/v1', '')
        double.calls.push({
          method,
          path,
          url: String(input),
          body: init?.body ? JSON.parse(String(init.body)) : undefined,
        })
        let status = 200
        let body: unknown = {}
        if (method === 'GET' && path === `/apps/${APP}`) body = { name: APP }
        else if (method === 'GET' && path === `/apps/${APP}/volumes`) {
          body = volumeExists
            ? [{ id: 'user-data', name: 'workspace', attached_machine_id: null }]
            : []
        } else if (method === 'GET' && path === `/apps/${APP}/machines`) body = []
        else if (method === 'POST' && path === `/apps/${APP}/machines`) {
          status = 412
          body = { error: 'failed_precondition: definite rejection' }
        } else if (method === 'DELETE' && path === `/apps/${APP}/volumes/user-data`) {
          volumeExists = false
          status = 204
        } else if (method === 'DELETE' && path === `/apps/${APP}`) status = 204
        else throw new Error(`Unexpected ${method} ${path}`)
        return {
          status,
          headers: { get: () => null },
          text: async () => JSON.stringify(body),
        } as unknown as Response
      }) as unknown as typeof fetch
      const provider = makeProvider(double, journal)

      await expect(
        provider.create({ projectId: PROJECT_ID, volumeName: 'workspace' }),
      ).rejects.toThrow('412')
      expect(double.matching(`POST /apps/${APP}/volumes`)).toHaveLength(0)
      const newAttempt = [...journal.attempts.values()].find(
        (attempt) => attempt.machineCreateFailed,
      )
      expect(newAttempt?.volumes[0]).toMatchObject({
        id: 'user-data',
        workspace: true,
        adoptedByAttemptId: newAttempt?.attemptId,
      })
      expect(newAttempt?.volumes[0]?.createdByAttemptId).toBeUndefined()
      await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 0, failed: 1 })
      expect(double.calls.filter((call) => call.method === 'DELETE')).toEqual([])
      expect(volumeExists).toBe(true)
    },
  )

  it('does not record a reconciliation GET rejection as a definitive Machine POST rejection', async () => {
    const journal = new MemoryJournal()
    const double = createFetchDouble()
      .on(`GET /apps/${APP}`, { body: { name: APP } })
      .on(`POST /apps/${APP}/machines`, {
        status: 503,
        body: { error: 'POST accepted but upstream response failed' },
      })
      .on(`GET /apps/${APP}/machines`, {
        status: 403,
        body: { error: 'temporary listing access denied' },
      })
    const provider = makeProvider(double, journal)

    await expect(provider.create({ projectId: PROJECT_ID })).rejects.toThrow('403')
    expect(double.matching(`POST /apps/${APP}/machines`)).toHaveLength(1)
    expect([...journal.attempts.values()][0]?.machineCreateFailed).not.toBe(true)
  })

  it('never turns an ambiguous POST plus GET error into authority to force-delete the app', async () => {
    const journal = new MemoryJournal()
    const double = createFetchDouble()
    let accepted = false
    let machineAlive = false
    let firstLookup = true
    double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      const path = String(input).replace('https://api.machines.dev/v1', '')
      double.calls.push({ method, path, url: String(input), body: undefined })
      let status = 200
      let body: unknown = {}
      if (method === 'GET' && path === `/apps/${APP}`) body = { name: APP }
      else if (method === 'POST' && path === `/apps/${APP}/machines`) {
        accepted = true
        machineAlive = true
        status = 503
        body = { error: 'upstream response failed after acceptance' }
      } else if (method === 'GET' && path === `/apps/${APP}/machines`) {
        if (firstLookup && accepted) {
          firstLookup = false
          status = 403
          body = { error: 'listing permission blip' }
        } else body = []
      } else if (method === 'GET' && path === `/apps/${APP}/volumes`) body = []
      else if (method === 'DELETE' && path === `/apps/${APP}?force=true`) {
        machineAlive = false
        status = 204
      } else throw new Error(`Unexpected ${method} ${path}`)
      return {
        status,
        headers: { get: () => null },
        text: async () => JSON.stringify(body),
      } as unknown as Response
    }) as unknown as typeof fetch
    const provider = makeProvider(double, journal)

    await expect(provider.create({ projectId: PROJECT_ID })).rejects.toThrow('403')
    expect(machineAlive).toBe(true)
    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 0, failed: 1 })
    expect(journal.attempts.size).toBe(1)
    expect(double.calls.filter((call) => call.method === 'DELETE')).toEqual([])
    expect(machineAlive).toBe(true)
  })

  it('does not force-delete a new Machine created while an old retirement holds its app lock', async () => {
    const journal = new MemoryJournal()
    journal.seed(failedIntent({ machineCreateFailed: true }))
    const double = createFetchDouble()
    let machine: Record<string, unknown> | null = null
    let appExists = true
    let retired = false
    let retiredListings = 0
    let entered = false
    double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      const path = String(input).replace('https://api.machines.dev/v1', '')
      double.calls.push({
        method,
        path,
        url: String(input),
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      })
      let status = 200
      let body: unknown = {}
      if (method === 'GET' && path === `/apps/${APP}`) {
        if (!appExists) status = 404
        else body = { name: APP }
      } else if (method === 'GET' && path === `/apps/${APP}/volumes`) body = []
      else if (method === 'GET' && path === `/apps/${APP}/machines`) {
        body = machine ? [machine] : []
        if (retired && ++retiredListings === 3 && !entered) {
          entered = true
          // This final listing was empty when Fly took its snapshot. The new
          // create lands before the old attempt's subsequent app DELETE.
          body = []
          await expect(provider.create({ projectId: PROJECT_ID })).resolves.toMatchObject({
            id: `${APP}:new-user-machine`,
          })
        }
      } else if (method === 'POST' && path === `/apps/${APP}/machines`) {
        const request = JSON.parse(String(init?.body))
        machine = {
          id: 'new-user-machine',
          name: request.name,
          state: 'started',
          config: request.config,
        }
        body = machine
      } else if (
        method === 'GET' &&
        path.startsWith(`/apps/${APP}/machines/new-user-machine/wait`)
      ) {
        body = machine
      } else if (method === 'DELETE' && path === `/apps/${APP}`) {
        machine = null
        appExists = false
        status = 204
      } else throw new Error(`Unexpected ${method} ${path}`)
      return {
        status,
        headers: { get: () => null },
        text: async () => JSON.stringify(body),
      } as unknown as Response
    }) as unknown as typeof fetch
    const provider = makeProvider(double, journal)
    const retire = journal.retire.bind(journal)
    journal.retire = async (attemptId, generation) => {
      await retire(attemptId, generation)
      retired = true
    }

    await provider.reconcileCreateAttempts()
    expect([...journal.attempts.values()].some((attempt) => attempt.state === 'serving')).toBe(true)
    expect(double.matching(`DELETE /apps/${APP}?force=true`)).toHaveLength(0)
    expect(machine).not.toBe(null)
  })

  it('explicitly retires an older emergency Machine despite a newer failed journal row', async () => {
    const journal = new MemoryJournal()
    journal.seed(failedIntent({ machineCreateFailed: true }))
    const machine = {
      id: 'older-writer',
      name: 'pre-journal-machine',
      state: 'started',
      config: {
        mounts: [{ volume: 'older-volume', path: '/workspace' }],
        metadata: {
          'molecule-sandbox.projectId': PROJECT_ID,
          'molecule-sandbox.volumeName': 'workspace',
        },
      },
    }
    const double = createFetchDouble()
    let alive = true
    let volumeAlive = true
    double.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      const path = String(input).replace('https://api.machines.dev/v1', '')
      double.calls.push({ method, path, url: String(input), body: undefined })
      let status = 200
      let body: unknown = {}
      if (method === 'GET' && path === `/apps/${APP}/machines/older-writer`) body = machine
      else if (method === 'GET' && path === `/apps/${APP}/machines`) body = alive ? [machine] : []
      else if (method === 'GET' && path === `/apps/${APP}/volumes`) {
        body = volumeAlive
          ? [
              {
                id: 'older-volume',
                name: 'older-workspace',
                attached_machine_id: alive ? 'older-writer' : null,
              },
            ]
          : []
      } else if (method === 'DELETE' && path === `/apps/${APP}/machines/older-writer?force=true`) {
        alive = false
        status = 204
      } else if (method === 'DELETE' && path === `/apps/${APP}/volumes/older-volume`) {
        volumeAlive = false
        status = 204
      } else if (method === 'DELETE' && path === `/apps/${APP}`) status = 204
      else throw new Error(`Unexpected ${method} ${path}`)
      return {
        status,
        headers: { get: () => null },
        text: async () => JSON.stringify(body),
      } as unknown as Response
    }) as unknown as typeof fetch
    const provider = makeProvider(double, journal)
    let machineAdoptionRecorded = false
    const begin = journal.begin.bind(journal)
    journal.begin = async (attempt) => {
      if (attempt.attemptId === `legacy:${APP}:older-writer`) {
        machineAdoptionRecorded = attempt.machineAdopted === true
      }
      await begin(attempt)
    }
    const adoptedVolumes: FlyCreateVolumeIntent[] = []
    const recordVolume = journal.recordVolume.bind(journal)
    journal.recordVolume = async (attemptId, volume) => {
      adoptedVolumes.push(structuredClone(volume))
      await recordVolume(attemptId, volume)
    }

    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 0, failed: 1 })
    expect(alive).toBe(true)
    await expect(
      provider.destroy(`${APP}:older-writer`, new AbortController().signal),
    ).resolves.toBeUndefined()
    expect(alive).toBe(false)
    expect(volumeAlive).toBe(false)
    expect(machineAdoptionRecorded).toBe(true)
    expect(adoptedVolumes[0]).toMatchObject({
      id: 'older-volume',
      adoptedByAttemptId: `legacy:${APP}:older-writer`,
    })
    expect(adoptedVolumes[0]?.createdByAttemptId).toBeUndefined()
  })
})

describe('round-sixteen accepted provenance and retirement', () => {
  it('keeps and reports a suspended older-writer Machine with no accepted-POST provenance', async () => {
    const journal = new MemoryJournal()
    journal.seed(failedIntent({ attemptId: 'legacy:old-deploy', sandboxId: `${APP}:user-machine` }))
    const machine = {
      id: 'user-machine',
      name: 'pre-journal-machine',
      state: 'suspended',
      config: { metadata: { 'molecule-sandbox.projectId': PROJECT_ID } },
    }
    const double = createFetchDouble()
    installRoutes(double, (method, path) => {
      if (method === 'GET' && path === `/apps/${APP}/machines`) return { body: [machine] }
      if (method === 'GET' && path === `/apps/${APP}/volumes`) return { body: [] }
      if (method === 'DELETE') return { status: 204 }
      throw new Error(`Unexpected ${method} ${path}`)
    })

    await expect(makeProvider(double, journal).reconcileCreateAttempts()).resolves.toEqual({
      deleted: 0,
      failed: 1,
    })
    expect(double.calls.filter((call) => call.method === 'DELETE')).toEqual([])
    expect(journal.attempts.size).toBe(1)
  })

  it('records a direct accepted Machine ID and deletes only that exact resource automatically', async () => {
    const journal = new MemoryJournal()
    const double = createFetchDouble()
    let wait = true
    let alive = true
    installRoutes(double, (method, path, body) => {
      if (method === 'GET' && path === `/apps/${APP}`) return { body: { name: APP } }
      if (method === 'POST' && path === `/apps/${APP}/machines`) {
        return {
          body: { id: 'accepted-machine', name: body.name, state: 'created', config: body.config },
        }
      }
      if (method === 'GET' && path.includes('/machines/accepted-machine/wait') && wait) {
        wait = false
        return { status: 503, body: { error: 'boot observation failed' } }
      }
      if (method === 'GET' && path === `/apps/${APP}/machines`) {
        return {
          body: alive
            ? [
                {
                  id: 'accepted-machine',
                  name: [...journal.attempts.keys()][0],
                  state: 'suspended',
                  config: { metadata: {} },
                },
              ]
            : [],
        }
      }
      if (method === 'GET' && path === `/apps/${APP}/volumes`) return { body: [] }
      if (method === 'DELETE' && path === `/apps/${APP}/machines/accepted-machine?force=true`) {
        alive = false
        return { status: 204 }
      }
      throw new Error(`Unexpected ${method} ${path}`)
    })
    const provider = makeProvider(double, journal)
    await expect(provider.create({ projectId: PROJECT_ID })).rejects.toThrow()
    const attempt = [...journal.attempts.values()][0]
    expect(attempt).toMatchObject({
      machineId: 'accepted-machine',
      machineCreatedByAttemptId: attempt.attemptId,
    })

    await provider.reconcileCreateAttempts()
    expect(alive).toBe(false)
    expect(
      double.matching(`DELETE /apps/${APP}/machines/accepted-machine?force=true`),
    ).toHaveLength(1)
  })

  it('does not forget an ambiguous volume POST after its lookup GET returns 403', async () => {
    const journal = new MemoryJournal()
    let accepted = false
    let lookupFailed = false
    const double = createFetchDouble()
    installRoutes(double, (method, path) => {
      if (method === 'GET' && path === `/apps/${APP}`) return { body: { name: APP } }
      if (method === 'POST' && path === `/apps/${APP}/volumes`) {
        accepted = true
        return { status: 503, body: { error: 'accepted but response lost' } }
      }
      if (method === 'GET' && path === `/apps/${APP}/volumes`) {
        if (accepted && !lookupFailed) {
          lookupFailed = true
          return { status: 403, body: { error: 'lookup denied' } }
        }
        return { body: [] }
      }
      if (method === 'GET' && path === `/apps/${APP}/machines`) return { body: [] }
      throw new Error(`Unexpected ${method} ${path}`)
    })
    const provider = makeProvider(double, journal, { appPerProject: false, appName: APP })
    await expect(
      provider.create({ projectId: PROJECT_ID, volumeName: 'workspace' }),
    ).rejects.toThrow('403')

    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 0, failed: 1 })
    expect(journal.attempts.size).toBe(1)
    expect([...journal.attempts.values()][0]?.volumes[0]?.resolved).toBe(false)
  })

  it('reports NULL-provenance KEEP rows and deliberately retires exact shared-app resources', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        volumes: [{ id: 'older-volume', name: 'older-volume', workspace: false, resolved: true }],
      }),
    )
    let externallyDeleted = false
    const double = createFetchDouble()
    installRoutes(double, (method, path) => {
      if (method === 'GET' && path === `/apps/${APP}/machines`) return { body: [] }
      if (method === 'GET' && path === `/apps/${APP}/machines/absent`) return { status: 404 }
      if (method === 'GET' && path === `/apps/${APP}/volumes`) {
        return { body: externallyDeleted ? [] : [{ id: 'older-volume', name: 'older-volume' }] }
      }
      if (method === 'DELETE' && path === `/apps/${APP}/volumes/older-volume`) {
        return { status: externallyDeleted ? 404 : 204 }
      }
      throw new Error(`Unexpected ${method} ${path}`)
    })
    const provider = makeProvider(double, journal, { appPerProject: false, appName: APP })
    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 0, failed: 1 })
    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 0, failed: 1 })
    expect(double.calls.filter((call) => call.method === 'DELETE')).toEqual([])
    await expect(
      provider.destroyApp(PROJECT_ID, APP, new AbortController().signal),
    ).rejects.toThrow('shared Fly app')
    await expect(provider.destroy(`${APP}:absent`, new AbortController().signal)).rejects.toThrow(
      'durable ownership record',
    )

    externallyDeleted = true
    await provider.destroyAttempt('attempt-1', new AbortController().signal)
    expect(journal.attempts.size).toBe(0)
    expect(double.matching(`DELETE /apps/${APP}/volumes/older-volume`)).toHaveLength(1)
  })

  it('retires expired creating siblings instead of letting their KEEP guards deadlock', async () => {
    const journal = new MemoryJournal()
    for (const id of ['crashed-one', 'crashed-two']) {
      journal.seed(
        failedIntent({
          attemptId: id,
          state: 'creating',
          machineCreateFailed: true,
          appCreatedByAttemptId: id === 'crashed-one' ? id : undefined,
          appCreateResolved: id === 'crashed-one',
        }),
      )
    }
    journal.reclaimable = async () =>
      [...journal.attempts.values()]
        .filter((attempt) => attempt.state !== 'serving')
        .map((attempt) => structuredClone(attempt))
    const double = createFetchDouble()
    installRoutes(double, (method, path) => {
      if (
        method === 'GET' &&
        (path === `/apps/${APP}/machines` || path === `/apps/${APP}/volumes`)
      ) {
        return { body: [] }
      }
      if (method === 'DELETE' && path.startsWith(`/apps/${APP}`)) return { status: 204 }
      throw new Error(`Unexpected ${method} ${path}`)
    })
    const provider = makeProvider(double, journal)
    await provider.reconcileCreateAttempts()
    await provider.reconcileCreateAttempts()

    expect([...journal.attempts.values()].map((attempt) => attempt.state)).not.toEqual([
      'creating',
      'creating',
    ])
  })

  it('does not let an unrelated serving shared-app project strand a fresh failed volume', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        machineCreateFailed: true,
        volumes: [
          {
            id: 'fresh-failed-volume',
            name: 'fresh-failed-volume',
            workspace: true,
            resolved: true,
            createdByAttemptId: 'attempt-1',
          },
        ],
      }),
    )
    journal.seed(
      failedIntent({
        attemptId: 'unrelated-serving',
        projectId: 'different-project',
        state: 'serving',
        sandboxId: `${APP}:other-user`,
      }),
    )
    const other = {
      id: 'other-user',
      name: 'unrelated-serving',
      state: 'started',
      config: {
        metadata: { 'molecule-sandbox.projectId': 'different-project' },
        mounts: [{ volume: 'other-workspace' }],
      },
    }
    let freshVolumeAlive = true
    const double = createFetchDouble()
    installRoutes(double, (method, path) => {
      if (method === 'GET' && path === `/apps/${APP}/machines`) return { body: [other] }
      if (method === 'GET' && path === `/apps/${APP}/volumes`) {
        return {
          body: freshVolumeAlive
            ? [{ id: 'fresh-failed-volume', name: 'fresh-failed-volume' }]
            : [],
        }
      }
      if (method === 'DELETE' && path === `/apps/${APP}/volumes/fresh-failed-volume`) {
        freshVolumeAlive = false
        return { status: 204 }
      }
      throw new Error(`Unexpected ${method} ${path}`)
    })
    const provider = makeProvider(double, journal, { appPerProject: false, appName: APP })
    await provider.reconcileCreateAttempts()
    await provider.reconcileCreateAttempts()

    expect(freshVolumeAlive).toBe(false)
    expect(journal.attempts.get('unrelated-serving')?.state).toBe('serving')
  })

  it('refuses forced explicit app retirement over a racing older writer', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({ attemptId: 'old-attempt', state: 'serving', sandboxId: `${APP}:old-machine` }),
    )
    const oldMachine = {
      id: 'old-machine',
      name: 'old-attempt',
      state: 'started',
      config: {
        metadata: {
          'molecule-sandbox.projectId': PROJECT_ID,
          'molecule-sandbox.createAttempt': 'old-attempt',
        },
      },
    }
    let oldAlive = true
    let newMachine: Record<string, unknown> | null = null
    let retiredEmptyListings = 0
    let raced = false
    const double = createFetchDouble()
    installRoutes(double, async (method, path, body) => {
      if (method === 'GET' && path === `/apps/${APP}/machines/old-machine`)
        return { body: oldMachine }
      if (method === 'GET' && path === `/apps/${APP}`) return { body: { name: APP } }
      if (method === 'GET' && path === `/apps/${APP}/volumes`) return { body: [] }
      if (method === 'GET' && path === `/apps/${APP}/machines`) {
        if (!oldAlive && !raced && ++retiredEmptyListings === 3) {
          raced = true
          await provider.create({ projectId: PROJECT_ID })
          return { body: [] }
        }
        return {
          body: [...(oldAlive ? [oldMachine] : []), ...(newMachine ? [newMachine] : [])],
        }
      }
      if (method === 'DELETE' && path === `/apps/${APP}/machines/old-machine?force=true`) {
        oldAlive = false
        return { status: 204 }
      }
      if (method === 'POST' && path === `/apps/${APP}/machines`) {
        newMachine = { id: 'new-user', name: body.name, state: 'started', config: body.config }
        return { body: newMachine }
      }
      if (method === 'GET' && path.startsWith(`/apps/${APP}/machines/new-user/wait`)) {
        return { body: newMachine }
      }
      if (method === 'DELETE' && path === `/apps/${APP}?force=true`) {
        newMachine = null
        return { status: 204 }
      }
      if (method === 'DELETE' && path === `/apps/${APP}`) {
        return newMachine ? { status: 409, body: { error: 'app has Machines' } } : { status: 204 }
      }
      throw new Error(`Unexpected ${method} ${path}`)
    })
    const provider = makeProvider(double, journal)

    // The refused destroy must reject (app delete got a 409) — the assertions
    // below cover its side effects only.
    await expect(
      provider.destroy(`${APP}:old-machine`, new AbortController().signal),
    ).rejects.toThrow()
    expect(raced).toBe(true)
    expect(newMachine).not.toBe(null)
    expect(journal.attempts.get('old-attempt')?.state).toBe('abandoned')
    expect(double.matching(`DELETE /apps/${APP}?force=true`)).toHaveLength(0)
  })

  it('keeps a racing Machine and never automatically deletes its app', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        machineCreateFailed: true,
        appCreatedByAttemptId: 'attempt-1',
        appCreateResolved: true,
      }),
    )
    let retired = false
    const retire = journal.retire.bind(journal)
    journal.retire = async (id, generation) => {
      await retire(id, generation)
      retired = true
    }
    let machine: Record<string, unknown> | null = null
    let listings = 0
    const double = createFetchDouble()
    installRoutes(double, (method, path) => {
      if (method === 'GET' && path === `/apps/${APP}/volumes`) return { body: [] }
      if (method === 'GET' && path === `/apps/${APP}/machines`) {
        if (retired && ++listings === 3 && !machine) {
          machine = { id: 'new-user', name: 'older-writer', state: 'started', config: {} }
          return { body: [] }
        }
        return { body: machine ? [machine] : [] }
      }
      if (method === 'DELETE' && path === `/apps/${APP}`) {
        return machine ? { status: 409, body: { error: 'app has Machines' } } : { status: 204 }
      }
      if (method === 'DELETE' && path === `/apps/${APP}?force=true`) {
        machine = null
        return { status: 204 }
      }
      throw new Error(`Unexpected ${method} ${path}`)
    })
    await makeProvider(double, journal).reconcileCreateAttempts()

    expect(machine).not.toBe(null)
    expect(journal.attempts.size).toBe(1)
    expect(double.matching(`DELETE /apps/${APP}?force=true`)).toHaveLength(0)
    expect(double.matching(`DELETE /apps/${APP}`)).toHaveLength(0)
  })

  it('can deliberately retire a NULL-provenance empty per-project app and detached volume', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        volumes: [{ id: 'legacy-volume', name: 'legacy-volume', workspace: true, resolved: true }],
      }),
    )
    let volumeAlive = true
    let appAlive = true
    const double = createFetchDouble()
    installRoutes(double, (method, path) => {
      if (method === 'GET' && path === `/apps/${APP}/machines`) {
        return appAlive ? { body: [] } : { status: 404 }
      }
      if (method === 'GET' && path === `/apps/${APP}/volumes`) {
        return appAlive
          ? { body: volumeAlive ? [{ id: 'legacy-volume', name: 'legacy-volume' }] : [] }
          : { status: 404 }
      }
      if (method === 'GET' && path === `/apps/${APP}`) {
        return appAlive ? { body: { name: APP } } : { status: 404 }
      }
      if (method === 'DELETE' && path === `/apps/${APP}/volumes/legacy-volume`) {
        volumeAlive = false
        return { status: 204 }
      }
      if (method === 'DELETE' && (path === `/apps/${APP}` || path === `/apps/${APP}?force=true`)) {
        appAlive = false
        return { status: 204 }
      }
      throw new Error(`Unexpected ${method} ${path}`)
    })
    await makeProvider(double, journal).destroyApp(PROJECT_ID, APP, new AbortController().signal)

    expect({ volumeAlive, appAlive, attempts: journal.attempts.size }).toEqual({
      volumeAlive: false,
      appAlive: false,
      attempts: 0,
    })
  })

  it('closes the create fence before journaling or calling Fly', async () => {
    const journal = new MemoryJournal()
    journal.createAllowed = false
    const double = createFetchDouble()
    const provider = makeProvider(double, journal)

    await expect(provider.create({ projectId: PROJECT_ID })).rejects.toThrow('rollout fence')
    expect(journal.attempts.size).toBe(0)
    expect(double.calls).toEqual([])
  })
})

describe('round-seventeen authoritative retirement', () => {
  it('does not forget a retained legacy Machine whose exact identity is unresolved', async () => {
    const journal = new MemoryJournal()
    journal.seed(failedIntent({ attemptId: 'legacy:retained', sandboxId: `${APP}:retained-user` }))
    let alive = true
    const machine = {
      id: 'retained-user',
      name: 'old-user',
      state: 'suspended',
      config: { metadata: { 'molecule-sandbox.projectId': PROJECT_ID } },
    }
    const double = createFetchDouble()
    installRoutes(double, (method, path) => {
      if (method === 'GET' && path === `/apps/${APP}/machines`) {
        return { body: alive ? [machine] : [] }
      }
      if (method === 'GET' && path === `/apps/${APP}/volumes`) return { body: [] }
      if (method === 'DELETE' && path === `/apps/${APP}/machines/retained-user?force=true`) {
        alive = false
        return { status: 204 }
      }
      throw new Error(`Unexpected ${method} ${path}`)
    })
    const provider = makeProvider(double, journal, { appPerProject: false, appName: APP })

    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 0, failed: 1 })
    // Unresolved identity refuses the destroy quietly (the promise resolves);
    // retention — not the promise outcome — is asserted below.
    await provider
      .destroyAttempt('legacy:retained', new AbortController().signal)
      .catch((_error) => {})

    expect({
      orphaned: alive && !journal.attempts.has('legacy:retained'),
      deletes: double.calls.filter((call) => call.method === 'DELETE').map((call) => call.path),
    }).toMatchObject({ orphaned: false })
  })

  it('deliberately retires a NULL-provenance Machine with an exact recorded ID', async () => {
    const journal = new MemoryJournal()
    journal.seed(failedIntent({ machineId: 'retained-user' }))
    let alive = true
    const double = createFetchDouble()
    installRoutes(double, (method, path) => {
      if (method === 'GET' && path === `/apps/${APP}/machines`) {
        return {
          body: alive ? [{ id: 'retained-user', state: 'suspended', config: {} }] : [],
        }
      }
      if (method === 'GET' && path === `/apps/${APP}/volumes`) return { body: [] }
      if (method === 'DELETE' && path === `/apps/${APP}/machines/retained-user?force=true`) {
        alive = false
        return { status: 204 }
      }
      throw new Error(`Unexpected ${method} ${path}`)
    })
    const provider = makeProvider(double, journal, { appPerProject: false, appName: APP })

    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 0, failed: 1 })
    await provider.destroyAttempt('attempt-1', new AbortController().signal)

    expect({ alive, rows: journal.attempts.size }).toEqual({ alive: false, rows: 0 })
  })

  it('observes a recovered volume without delete provenance, then deliberately retires it', async () => {
    const journal = new MemoryJournal()
    let volumeName = ''
    let lookupFailed = false
    let alive = false
    const double = createFetchDouble()
    installRoutes(double, (method, path, body) => {
      if (method === 'GET' && path === `/apps/${APP}`) return { body: { name: APP } }
      if (method === 'POST' && path === `/apps/${APP}/volumes`) {
        volumeName = body.name!
        alive = true
        return { status: 503, body: { error: 'accepted but response lost' } }
      }
      if (method === 'GET' && path === `/apps/${APP}/volumes`) {
        if (alive && !lookupFailed) {
          lookupFailed = true
          return { status: 403, body: { error: 'temporary lookup denial' } }
        }
        return {
          body: alive ? [{ id: 'lost-response-volume', name: volumeName, state: 'created' }] : [],
        }
      }
      if (method === 'GET' && path === `/apps/${APP}/machines`) return { body: [] }
      if (method === 'DELETE' && path === `/apps/${APP}/volumes/lost-response-volume`) {
        alive = false
        return { status: 204 }
      }
      throw new Error(`Unexpected ${method} ${path}`)
    })
    const provider = makeProvider(double, journal, { appPerProject: false, appName: APP })

    await expect(
      provider.create({ projectId: PROJECT_ID, volumeName: 'workspace' }),
    ).rejects.toThrow('403')
    const id = [...journal.attempts.keys()][0]
    const passes = [
      await provider.reconcileCreateAttempts(),
      await provider.reconcileCreateAttempts(),
    ]
    expect(journal.attempts.get(id)?.volumes[0]).toMatchObject({
      id: 'lost-response-volume',
      resolved: true,
      adoptedByAttemptId: id,
    })
    expect(journal.attempts.get(id)?.volumes[0]?.createdByAttemptId).toBeUndefined()
    expect(double.calls.filter((call) => call.method === 'DELETE')).toEqual([])
    let retirementError = ''
    try {
      await provider.destroyAttempt(id, new AbortController().signal)
    } catch (error) {
      retirementError = (error as Error).message
    }

    expect({ alive, rows: journal.attempts.size, retirementError, passes }).toMatchObject({
      alive: false,
      rows: 0,
      retirementError: '',
    })
  })

  for (const perProject of [false, true]) {
    it(`keeps an accepted Machine hidden by list lag (per-project: ${perProject})`, async () => {
      const journal = new MemoryJournal()
      const double = createFetchDouble()
      let accepted = false
      installRoutes(double, (method, path, body) => {
        if (method === 'GET' && path === `/apps/${APP}`) return { body: { name: APP } }
        if (method === 'POST' && path === `/apps/${APP}/machines`) {
          accepted = true
          return {
            body: { id: 'hidden-machine', name: body.name, state: 'created', config: body.config },
          }
        }
        if (method === 'GET' && path.includes('/machines/hidden-machine')) {
          return { status: 403, body: { error: 'observation unavailable' } }
        }
        if (
          method === 'GET' &&
          (path === `/apps/${APP}/machines` || path === `/apps/${APP}/volumes`)
        ) {
          return { body: [] }
        }
        if (method === 'DELETE' && path === `/apps/${APP}`) {
          return { status: 409, body: { error: 'app still contains hidden-machine' } }
        }
        throw new Error(`Unexpected ${method} ${path}`)
      })
      const provider = makeProvider(double, journal, {
        appPerProject: perProject,
        appName: perProject ? undefined : APP,
      })

      await expect(provider.create({ projectId: PROJECT_ID })).rejects.toThrow()
      const id = [...journal.attempts.keys()][0]
      expect(accepted).toBe(true)
      expect(journal.attempts.get(id)).toMatchObject({
        machineId: 'hidden-machine',
        machineCreatedByAttemptId: id,
      })
      await provider.reconcileCreateAttempts()

      expect({
        acceptedMachineAlive: true,
        recordRetained: journal.attempts.has(id),
        deletes: double.calls.filter((call) => call.method === 'DELETE').map((call) => call.path),
      }).toMatchObject({ recordRetained: true })
    })
  }

  it('never lets copied metadata select a different accepted Machine for destroy', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        state: 'serving',
        machineId: 'serving-original',
        machineCreatedByAttemptId: 'attempt-1',
        sandboxId: `${APP}:serving-original`,
      }),
    )
    const original = {
      id: 'serving-original',
      name: 'attempt-1',
      state: 'started',
      config: {
        metadata: {
          'molecule-sandbox.projectId': PROJECT_ID,
          'molecule-sandbox.createAttempt': 'attempt-1',
        },
      },
    }
    const clone = { ...original, id: 'stale-copy', name: 'copied-metadata' }
    let originalAlive = true
    let cloneAlive = true
    const double = createFetchDouble()
    installRoutes(double, (method, path) => {
      if (method === 'GET' && path === `/apps/${APP}/machines/stale-copy`) {
        return { body: clone }
      }
      if (method === 'GET' && path === `/apps/${APP}/machines`) {
        return {
          body: [...(cloneAlive ? [clone] : []), ...(originalAlive ? [original] : [])],
        }
      }
      if (method === 'GET' && path === `/apps/${APP}/volumes`) return { body: [] }
      if (method === 'DELETE' && path === `/apps/${APP}/machines/serving-original?force=true`) {
        originalAlive = false
        return { status: 204 }
      }
      if (method === 'DELETE' && path === `/apps/${APP}/machines/stale-copy?force=true`) {
        cloneAlive = false
        return { status: 204 }
      }
      throw new Error(`Unexpected ${method} ${path}`)
    })
    const provider = makeProvider(double, journal, { appPerProject: false, appName: APP })

    // The refusal keeps the clone alive and resolves quietly; survival of the
    // original is asserted below.
    await provider.destroy(`${APP}:stale-copy`, new AbortController().signal).catch((_error) => {})

    expect({
      originalAlive,
      cloneAlive,
      originalState: journal.attempts.get('attempt-1')?.state,
      deletes: double.calls.filter((call) => call.method === 'DELETE').map((call) => call.path),
    }).toMatchObject({ originalAlive: true, originalState: 'serving' })
  })
})

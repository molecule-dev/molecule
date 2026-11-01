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

describe('round-eighteen adversarial retirement', () => {
  it('retains an ambiguous Machine create whose POST response and list visibility are lost', async () => {
    const journal = new MemoryJournal()
    const double = createFetchDouble()
    let alive = false
    let outcomeAtDispatch: FlyCreateAttempt['machineCreateOutcome']
    installRoutes(double, (method, path, body) => {
      if (method === 'GET' && path === `/apps/${APP}`) return { body: { name: APP } }
      if (method === 'POST' && path === `/apps/${APP}/machines`) {
        outcomeAtDispatch = journal.attempts.get(body.name ?? '')?.machineCreateOutcome
        alive = true
        return { status: 503, body: { error: 'response lost after accepting Machine' } }
      }
      if (method === 'GET' && (path === `/apps/${APP}/machines` || path === `/apps/${APP}/volumes`))
        return { body: [] }
      throw new Error(`Unexpected ${method} ${path}`)
    })
    const provider = makeProvider(double, journal, { appPerProject: false, appName: APP })
    await expect(provider.create({ projectId: PROJECT_ID })).rejects.toThrow('unknown outcome')
    const id = [...journal.attempts.keys()][0]
    expect(journal.attempts.get(id)?.machineCreateFailed).toBeUndefined()
    expect(journal.attempts.get(id)?.machineId).toBeUndefined()
    expect(outcomeAtDispatch).toBe('pending')
    expect(journal.attempts.get(id)?.machineCreateOutcome).toBe('unknown')
    const summary = await provider.reconcileCreateAttempts()
    expect({
      alive,
      retained: journal.attempts.has(id),
      summary,
      deletes: double.calls.filter((c) => c.method === 'DELETE'),
    }).toMatchObject({ alive: true, retained: true, summary: { deleted: 0 }, deletes: [] })
  })

  it('persists a recovered Machine ID as observation without automatic delete authority', async () => {
    const journal = new MemoryJournal()
    const double = createFetchDouble()
    let alive = false
    let machine: { id: string; name: string; state: string; config: Record<string, unknown> }
    installRoutes(double, (method, path, body) => {
      if (method === 'GET' && path === `/apps/${APP}`) return { body: { name: APP } }
      if (method === 'POST' && path === `/apps/${APP}/machines`) {
        machine = {
          id: 'recovered-machine',
          name: body.name ?? '',
          state: 'started',
          config: body.config ?? {},
        }
        alive = true
        return { status: 503, body: { error: 'accepted response lost' } }
      }
      if (method === 'GET' && path === `/apps/${APP}/machines`) {
        return { body: alive ? [machine] : [] }
      }
      if (method === 'GET' && path.startsWith(`/apps/${APP}/machines/recovered-machine/wait`)) {
        return { body: machine }
      }
      if (method === 'GET' && path === `/apps/${APP}/volumes`) return { body: [] }
      if (method === 'DELETE' && path === `/apps/${APP}/machines/recovered-machine?force=true`) {
        alive = false
        return { status: 204 }
      }
      throw new Error(`Unexpected ${method} ${path}`)
    })
    const provider = makeProvider(double, journal, { appPerProject: false, appName: APP })
    await provider.create({ projectId: PROJECT_ID })
    const id = [...journal.attempts.keys()][0]
    expect(journal.attempts.get(id)).toMatchObject({
      machineId: 'recovered-machine',
      machineCreateOutcome: 'unknown',
    })
    expect(journal.attempts.get(id)?.machineCreatedByAttemptId).toBeUndefined()

    await journal.markState(id, 'failed')
    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 0, failed: 1 })
    expect(alive).toBe(true)
    expect(double.calls.filter((call) => call.method === 'DELETE')).toEqual([])

    await provider.destroyAttempt(id, new AbortController().signal)
    expect({ alive, retained: journal.attempts.has(id) }).toEqual({ alive: false, retained: false })
  })

  it('keeps a legacy NULL Machine outcome unknown behind empty shared-app listings', async () => {
    const journal = new MemoryJournal()
    journal.seed(failedIntent({ machineCreateOutcome: undefined }))
    const double = createFetchDouble()
    let visible = false
    installRoutes(double, (method, path) => {
      if (method === 'GET' && path === `/apps/${APP}/machines`) {
        return {
          body: visible
            ? [{ id: 'legacy-observed', name: 'attempt-1', state: 'stopped', config: {} }]
            : [],
        }
      }
      if (method === 'GET' && path === `/apps/${APP}/volumes`) return { body: [] }
      throw new Error(`Unexpected ${method} ${path}`)
    })
    const provider = makeProvider(double, journal, { appPerProject: false, appName: APP })
    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 0, failed: 1 })
    expect(journal.attempts.has('attempt-1')).toBe(true)
    expect(double.calls.filter((call) => call.method === 'DELETE')).toEqual([])

    visible = true
    await expect(provider.reconcileCreateAttempts()).resolves.toEqual({ deleted: 0, failed: 1 })
    expect(journal.attempts.get('attempt-1')).toMatchObject({
      machineId: 'legacy-observed',
      machineCreateOutcome: 'unknown',
    })
    expect(journal.attempts.get('attempt-1')?.machineCreatedByAttemptId).toBeUndefined()
    expect(double.calls.filter((call) => call.method === 'DELETE')).toEqual([])
  })

  it('does not let destroyApp of B retire a serving attempt in app A through copied metadata', async () => {
    const otherApp = 'mol-sandbox-other-project'
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        attemptId: 'attempt-A',
        appName: otherApp,
        projectId: 'other-project',
        state: 'serving',
        machineId: 'machine-A',
        machineCreatedByAttemptId: 'attempt-A',
        sandboxId: `${otherApp}:machine-A`,
      }),
    )
    const original = {
      id: 'machine-A',
      name: 'attempt-A',
      state: 'started',
      config: {
        metadata: {
          'molecule-sandbox.projectId': 'other-project',
          'molecule-sandbox.createAttempt': 'attempt-A',
        },
      },
    }
    const clone = { ...original, id: 'machine-B', name: 'clone-B' }
    let originalAlive = true
    const double = createFetchDouble()
    installRoutes(double, (method, path) => {
      if (method === 'GET' && path === `/apps/${APP}/machines`) return { body: [clone] }
      if (method === 'GET' && path === `/apps/${otherApp}/machines`)
        return { body: originalAlive ? [original] : [] }
      if (
        method === 'GET' &&
        (path === `/apps/${APP}/volumes` || path === `/apps/${otherApp}/volumes`)
      )
        return { body: [] }
      if (method === 'DELETE' && path === `/apps/${otherApp}/machines/machine-A?force=true`) {
        originalAlive = false
        return { status: 204 }
      }
      if (method === 'DELETE' && path === `/apps/${otherApp}`) return { status: 202 }
      throw new Error(`Unexpected ${method} ${path}`)
    })
    await makeProvider(double, journal)
      .destroyApp(PROJECT_ID, APP, new AbortController().signal)
      .catch(() => {})
    expect({
      originalAlive,
      originalState: journal.attempts.get('attempt-A')?.state,
      deletes: double.calls.filter((c) => c.method === 'DELETE').map((c) => c.path),
    }).toMatchObject({ originalAlive: true, originalState: 'serving', deletes: [] })
  })

  for (const perProject of [true, false])
    it(`does not delete another retained attempt stopped user Machine behind an empty list (per-project: ${perProject})`, async () => {
      const journal = new MemoryJournal()
      journal.seed(
        failedIntent({
          appCreatedByAttemptId: 'attempt-1',
          appCreateResolved: true,
          machineCreateFailed: true,
        }),
      )
      journal.seed(
        failedIntent({
          attemptId: 'older-user',
          sandboxId: `${APP}:stopped-user`,
          machineId: 'stopped-user',
          machineCreatedByAttemptId: 'older-user',
          volumes: [
            {
              id: 'user-workspace',
              name: 'user-workspace',
              workspace: true,
              resolved: true,
              adoptedByAttemptId: 'older-user',
            },
          ],
        }),
      )
      const double = createFetchDouble()
      let newerMachineAlive = true
      let userWorkspaceAlive = true
      installRoutes(double, (method, path) => {
        if (
          method === 'GET' &&
          (path === `/apps/${APP}/machines` || path === `/apps/${APP}/volumes`)
        )
          return { body: [] }
        if (method === 'DELETE' && path === `/apps/${APP}`) {
          newerMachineAlive = false
          userWorkspaceAlive = false
          return { status: 202 }
        }
        throw new Error(`Unexpected ${method} ${path}`)
      })
      const summary = await makeProvider(double, journal, {
        appPerProject: perProject,
        appName: perProject ? undefined : APP,
      }).reconcileCreateAttempts({ attemptId: 'attempt-1' })
      expect({
        newerMachineAlive,
        userWorkspaceAlive,
        summary,
        deletes: double.calls.filter((c) => c.method === 'DELETE').map((c) => c.path),
      }).toMatchObject({ newerMachineAlive: true, userWorkspaceAlive: true })
    })
})

describe('round-eighteen exact-read controls', () => {
  for (const outcome of [403, 429, 500, 'timeout'] as const) {
    it(`keeps an exact Machine on ${outcome}, then settles an exact 404`, async () => {
      const journal = new MemoryJournal()
      journal.seed(
        failedIntent({ machineId: 'accepted-machine', machineCreatedByAttemptId: 'attempt-1' }),
      )
      const double = createFetchDouble()
      let absent = false
      installRoutes(double, (method, path) => {
        if (
          method === 'GET' &&
          (path === `/apps/${APP}/machines` || path === `/apps/${APP}/volumes`)
        )
          return { body: [] }
        if (method === 'GET' && path === `/apps/${APP}/machines/accepted-machine`) {
          if (absent) return { status: 404 }
          if (outcome === 'timeout') throw new DOMException('request timed out', 'TimeoutError')
          return { status: outcome, body: { error: 'lookup unavailable' } }
        }
        throw new Error(`Unexpected ${method} ${path}`)
      })
      const provider = makeProvider(double, journal, { appPerProject: false, appName: APP })
      expect(await provider.reconcileCreateAttempts()).toEqual({ deleted: 0, failed: 1 })
      expect(journal.attempts.has('attempt-1')).toBe(true)
      expect(double.calls.filter((c) => c.method === 'DELETE')).toEqual([])
      absent = true
      expect(await provider.reconcileCreateAttempts()).toEqual({ deleted: 1, failed: 0 })
      expect(journal.attempts.size).toBe(0)
    })
  }

  it('permits destroyApp for an exactly journaled app without copied metadata', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        state: 'serving',
        machineId: 'own-machine',
        machineCreatedByAttemptId: 'attempt-1',
        sandboxId: `${APP}:own-machine`,
      }),
    )
    let alive = true
    const machine = {
      id: 'own-machine',
      name: 'attempt-1',
      state: 'started',
      config: {
        metadata: {
          'molecule-sandbox.projectId': PROJECT_ID,
          'molecule-sandbox.createAttempt': 'attempt-1',
        },
      },
    }
    const double = createFetchDouble()
    installRoutes(double, (method, path) => {
      if (method === 'GET' && path === `/apps/${APP}/machines`)
        return { body: alive ? [machine] : [] }
      if (method === 'GET' && path === `/apps/${APP}/volumes`) return { body: [] }
      if (method === 'DELETE' && path === `/apps/${APP}/machines/own-machine?force=true`) {
        alive = false
        return { status: 204 }
      }
      if (method === 'DELETE' && path === `/apps/${APP}`) return { status: 202 }
      throw new Error(`Unexpected ${method} ${path}`)
    })
    await makeProvider(double, journal).destroyApp(PROJECT_ID, APP, new AbortController().signal)
    expect({ alive, rows: journal.attempts.size }).toEqual({ alive: false, rows: 0 })
  })

  it('settles unresolved volume responsibility after an exact app 404 instead of looping silently', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({ volumes: [{ name: 'unknown', workspace: false, resolved: false }] }),
    )
    const double = createFetchDouble()
    installRoutes(double, (method, path) => {
      if (method === 'GET' && path.startsWith(`/apps/${APP}`)) return { status: 404 }
      throw new Error(`Unexpected ${method} ${path}`)
    })
    const provider = makeProvider(double, journal)
    const passes = [
      await provider.reconcileCreateAttempts(),
      await provider.reconcileCreateAttempts(),
    ]
    let retirementError = ''
    try {
      await provider.destroyApp(PROJECT_ID, APP, new AbortController().signal)
    } catch (error) {
      retirementError = (error as Error).message
    }
    expect({ retained: journal.attempts.has('attempt-1'), passes, retirementError }).toMatchObject({
      retained: false,
      retirementError: '',
    })
  })

  it('settles a shared-app unresolved volume after exact app 404 during deliberate retirement', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({ volumes: [{ name: 'unknown', workspace: false, resolved: false }] }),
    )
    const double = createFetchDouble()
    installRoutes(double, (method, path) => {
      if (method === 'GET' && path.startsWith(`/apps/${APP}`)) return { status: 404 }
      throw new Error(`Unexpected ${method} ${path}`)
    })
    const provider = makeProvider(double, journal, { appPerProject: false, appName: APP })
    await provider.destroyAttempt('attempt-1', new AbortController().signal)
    expect(journal.attempts.has('attempt-1')).toBe(false)
  })
})

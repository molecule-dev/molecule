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
      attempt.volumes[index] = { ...recorded, workspace: previous.workspace || recorded.workspace }
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
      const crossNetwork = [...this.attempts.values()].some((other) =>
        other.addresses.some(
          (candidate) =>
            candidate.targetApp === address.targetApp &&
            candidate.ip === address.ip &&
            candidate.network !== address.network,
        ),
      )
      if (crossNetwork) throw new Error('Refusing cross-network Fly address ownership transfer')
      for (const other of this.attempts.values()) {
        if (other.attemptId === attemptId) continue
        other.addresses = other.addresses.filter(
          (candidate) =>
            candidate.targetApp !== address.targetApp || candidate.network !== address.network,
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

describe('round-nineteen authority regressions', () => {
  for (const otherOwner of [false, true]) {
    it(`does not retire an observed Machine after another serving attempt claims it (other owner: ${otherOwner})`, async () => {
      const journal = new MemoryJournal()
      journal.seed(failedIntent({ attemptId: 'observer', machineCreateOutcome: 'unknown' }))
      await journal.recordMachineObservation('observer', 1, 'recovered-machine')
      if (otherOwner) {
        await journal.begin({
          attemptId: 'new-owner',
          projectId: 'second-project',
          appName: APP,
          state: 'serving',
          sandboxId: `${APP}:recovered-machine`,
        })
      }
      let alive = true
      const machine = {
        id: 'recovered-machine',
        name: otherOwner ? 'new-owner' : 'observer',
        state: 'started',
        config: {
          metadata: {
            'molecule-sandbox.createAttempt': otherOwner ? 'new-owner' : 'observer',
          },
        },
      }
      const double = createFetchDouble()
      installRoutes(double, (method, path) => {
        if (method === 'GET' && path === `/apps/${APP}/machines`)
          return { body: alive ? [machine] : [] }
        if (method === 'GET' && path === `/apps/${APP}/machines/recovered-machine`)
          return alive ? { body: machine } : { status: 404 }
        if (method === 'GET' && path === `/apps/${APP}/volumes`) return { body: [] }
        if (method === 'DELETE' && path === `/apps/${APP}/machines/recovered-machine?force=true`) {
          alive = false
          return { status: 204 }
        }
        throw new Error(`Unexpected ${method} ${path}`)
      })
      const provider = makeProvider(double, journal, { appPerProject: false, appName: APP })
      expect(await provider.reconcileCreateAttempts()).toEqual({ deleted: 0, failed: 1 })
      expect(alive).toBe(true)
      await provider.destroyAttempt('observer', new AbortController().signal).catch(() => {})
      expect({
        alive,
        serving: journal.attempts.get('new-owner')?.state,
        retained: journal.attempts.has('observer'),
        deletes: double.calls.filter((call) => call.method === 'DELETE').map((call) => call.path),
      }).toMatchObject(
        otherOwner
          ? { alive: true, serving: 'serving', retained: true, deletes: [] }
          : { alive: false, retained: false },
      )
    })
  }

  for (const copied of [false, true]) {
    it(`legacy Machine adoption cannot steal and delete another app's durable Flycast IP (copied: ${copied})`, async () => {
      const sourceApp = copied ? 'mol-sandbox-source-project' : APP
      const journal = new MemoryJournal()
      if (copied) {
        journal.seed(
          failedIntent({
            attemptId: 'source-attempt',
            appName: sourceApp,
            projectId: 'source-project',
            state: 'serving',
            machineCreateOutcome: 'accepted',
            sandboxId: `${sourceApp}:source-machine`,
            machineId: 'source-machine',
            machineCreatedByAttemptId: 'source-attempt',
            addresses: [
              {
                targetApp: 'tenant-db',
                network: sourceApp,
                ip: 'fdaa::1234',
                owned: true,
                resolved: true,
              },
            ],
          }),
        )
      }
      let machineAlive = true
      let routeAlive = true
      const machine = {
        id: 'clone-machine',
        name: 'clone-machine',
        state: 'stopped',
        config: {
          metadata: {
            'molecule-sandbox.projectId': PROJECT_ID,
            'molecule-sandbox.createAttempt': copied ? 'source-attempt' : 'legacy-unused',
            'molecule-sandbox.privateRoutes': encodePrivateRoutes({ 'tenant-db': 'fdaa::1234' }),
          },
        },
      }
      const double = createFetchDouble()
      installRoutes(double, (method, path) => {
        if (method === 'GET' && path === `/apps/${APP}/machines/clone-machine`)
          return machineAlive ? { body: machine } : { status: 404 }
        if (method === 'GET' && path === `/apps/${APP}/machines`)
          return { body: machineAlive ? [machine] : [] }
        if (method === 'GET' && path === `/apps/${APP}/volumes`) return { body: [] }
        if (method === 'GET' && path === '/apps/tenant-db/ip_assignments')
          return {
            body: {
              ips: [{ ip: 'fdaa::1234', network: { name: sourceApp, org_slug: 'acme' } }],
            },
          }
        if (method === 'DELETE' && path === `/apps/${APP}/machines/clone-machine?force=true`) {
          machineAlive = false
          return { status: 204 }
        }
        if (method === 'DELETE' && path === '/apps/tenant-db/ip_assignments/fdaa%3A%3A1234') {
          routeAlive = false
          return { status: 204 }
        }
        if (method === 'DELETE' && path === `/apps/${APP}`) return { status: 202 }
        throw new Error(`Unexpected ${method} ${path}`)
      })
      await makeProvider(double, journal)
        .destroy(`${APP}:clone-machine`, new AbortController().signal)
        .catch(() => {})
      expect({ routeAlive, source: journal.attempts.get('source-attempt') }).toMatchObject(
        copied
          ? {
              routeAlive: true,
              source: {
                state: 'serving',
                addresses: [{ ip: 'fdaa::1234', network: sourceApp, owned: true }],
              },
            }
          : { routeAlive: false },
      )
    })
  }

  for (const appExisted of [false, true]) {
    it(`probe cleanup cannot delete an app it merely adopted (existing: ${appExisted})`, async () => {
      let deletedApp = false
      let createdApps = 0
      const probedApps = new Set<string>()
      const double = createFetchDouble()
      installRoutes(double, (method, path) => {
        if (method === 'GET' && /^\/apps\/[^/]+$/.test(path)) {
          probedApps.add(path.slice(6))
          return appExisted ? { body: { name: path.slice(6) } } : { status: 404 }
        }
        if (method === 'POST' && path === '/apps') {
          createdApps++
          return { status: 201 }
        }
        if (method === 'POST' && path.endsWith('/machines'))
          return { status: 403, body: { error: 'probe launch refused' } }
        if (method === 'DELETE' && /^\/apps\/[^/]+$/.test(path)) {
          deletedApp = true
          return { status: 202 }
        }
        throw new Error(`Unexpected ${method} ${path}`)
      })
      await makeProvider(double).verifyEgress()
      expect({ deletedApp, createdApps, retried: !appExisted || probedApps.size > 1 }).toEqual({
        deletedApp: !appExisted,
        createdApps: appExisted ? 0 : 1,
        retried: true,
      })
    })
  }
})

describe('round-nineteen authority boundaries', () => {
  it('rejects cross-network address transfer without mutating either binding', async () => {
    const journal = new MemoryJournal()
    journal.seed(
      failedIntent({
        attemptId: 'source',
        appName: 'source-app',
        state: 'serving',
        addresses: [
          {
            targetApp: 'tenant-db',
            network: 'source-app',
            ip: 'fdaa::1234',
            owned: true,
            resolved: true,
          },
        ],
      }),
    )
    journal.seed(failedIntent({ attemptId: 'target', appName: 'target-app' }))
    const foreign = {
      targetApp: 'tenant-db',
      network: 'target-app',
      ip: 'fdaa::1234',
      owned: true,
      resolved: true,
    }
    await expect(journal.recordAddress('target', foreign)).rejects.toThrow('cross-network')
    expect(journal.attempts.get('source')?.addresses).toHaveLength(1)
    expect(journal.attempts.get('target')?.addresses).toEqual([])

    await journal.recordAddress('target', { ...foreign, network: 'source-app' })
    expect(journal.attempts.get('source')?.addresses).toEqual([])
    expect(journal.attempts.get('target')?.addresses).toEqual([
      { ...foreign, network: 'source-app' },
    ])
  })

  it('rechecks observed Machine references immediately before DELETE', async () => {
    const journal = new MemoryJournal()
    journal.seed(failedIntent({ attemptId: 'observer', machineCreateOutcome: 'unknown' }))
    await journal.recordMachineObservation('observer', 1, 'recovered-machine')
    let alive = true
    let destroyReads = 0
    const machine = {
      id: 'recovered-machine',
      name: 'observer',
      state: 'started',
      config: { metadata: { 'molecule-sandbox.createAttempt': 'observer' } },
    }
    const double = createFetchDouble()
    installRoutes(double, async (method, path) => {
      if (method === 'GET' && path === `/apps/${APP}/machines`) {
        if (++destroyReads === 2) {
          await journal.begin({
            attemptId: 'late-owner',
            projectId: 'second-project',
            appName: APP,
            state: 'serving',
            sandboxId: `${APP}:recovered-machine`,
          })
        }
        return { body: alive ? [machine] : [] }
      }
      if (method === 'GET' && path === `/apps/${APP}/machines/recovered-machine`)
        return alive ? { body: machine } : { status: 404 }
      if (method === 'GET' && path === `/apps/${APP}/volumes`) return { body: [] }
      if (method === 'DELETE' && path === `/apps/${APP}/machines/recovered-machine?force=true`) {
        alive = false
        return { status: 204 }
      }
      throw new Error(`Unexpected ${method} ${path}`)
    })
    const provider = makeProvider(double, journal, { appPerProject: false, appName: APP })
    await provider.destroyAttempt('observer', new AbortController().signal).catch(() => {})
    expect({ alive, retained: journal.attempts.has('observer') }).toEqual({
      alive: true,
      retained: true,
    })
  })

  for (const operation of ['destroy', 'destroyApp'] as const) {
    for (const copied of [false, true]) {
      it(`validates no-journal ${operation} route authority (copied: ${copied})`, async () => {
        const sourceApp = copied ? 'mol-sandbox-source-project' : APP
        let routeAlive = true
        let machineAlive = true
        const machine = {
          id: 'clone-machine',
          name: 'clone-machine',
          state: 'stopped',
          config: {
            metadata: {
              'molecule-sandbox.privateRoutes': encodePrivateRoutes({
                'tenant-db': 'fdaa::1234',
              }),
            },
          },
        }
        const double = createFetchDouble()
        installRoutes(double, (method, path) => {
          if (method === 'GET' && path === `/apps/${APP}/machines/clone-machine`)
            return { body: machine }
          if (method === 'GET' && path === `/apps/${APP}/machines`)
            return { body: operation === 'destroyApp' && machineAlive ? [machine] : [] }
          if (method === 'GET' && path === `/apps/${APP}/volumes`) return { body: [] }
          if (method === 'GET' && path === '/apps/tenant-db/ip_assignments')
            return {
              body: {
                ips: [{ ip: 'fdaa::1234', network: { name: sourceApp, org_slug: 'acme' } }],
              },
            }
          if (method === 'DELETE' && path === `/apps/${APP}/machines/clone-machine?force=true`) {
            machineAlive = false
            return { status: 204 }
          }
          if (method === 'DELETE' && path === `/apps/${APP}`) return { status: 202 }
          if (method === 'DELETE' && path === '/apps/tenant-db/ip_assignments/fdaa%3A%3A1234') {
            routeAlive = false
            return { status: 204 }
          }
          throw new Error(`Unexpected ${method} ${path}`)
        })
        const provider = makeProvider(double)
        if (operation === 'destroy') {
          await provider.destroy(`${APP}:clone-machine`, new AbortController().signal)
        } else {
          await provider.destroyApp(PROJECT_ID, APP, new AbortController().signal)
        }
        expect(routeAlive).toBe(copied)
      })
    }
  }

  it('retries a colliding probe name and deletes only the replacement it created', async () => {
    const probedApps: string[] = []
    let createdApp: string | undefined
    let deletedApp: string | undefined
    const double = createFetchDouble()
    installRoutes(double, (method, path, body) => {
      if (method === 'GET' && /^\/apps\/[^/]+$/.test(path)) {
        probedApps.push(path.slice(6))
        return probedApps.length === 1 ? { body: { name: path.slice(6) } } : { status: 404 }
      }
      if (method === 'POST' && path === '/apps') {
        createdApp = body.name
        return { status: 201 }
      }
      if (method === 'POST' && path.endsWith('/machines'))
        return { status: 403, body: { error: 'probe launch refused' } }
      if (method === 'DELETE' && /^\/apps\/[^/]+$/.test(path)) {
        deletedApp = path.slice(6)
        return { status: 202 }
      }
      throw new Error(`Unexpected ${method} ${path}`)
    })
    await makeProvider(double).verifyEgress()
    expect({ probedApps: probedApps.length, createdApp, deletedApp }).toEqual({
      probedApps: 2,
      createdApp: probedApps[1],
      deletedApp: probedApps[1],
    })
  })
})

/**
 * Tests for the Fly.io sandbox provider: app/volume provisioning, tenant
 * isolation, the lifecycle → Machines API mapping (especially sleep → suspend
 * and wake → start), file operations, and the admitted gaps.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFetchDouble, mockLogger } from './helpers.js'

vi.mock('@molecule/api-bond', () => ({ getLogger: () => mockLogger }))
vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}))

const { FlyApiClient } = await import('../api.js')
const { createProvider } = await import('../provider.js')
const { shellQuote } = await import('../utilities.js')

import type { FlyioConfig } from '../types.js'

const PROJECT_ID = 'a3f1c0de-0000-4000-8000-000000000001'
const APP = `mol-sandbox-${PROJECT_ID}`

/**
 * Builds a provider wired to a fetch double with retry sleeps collapsed.
 * @param config - Provider configuration overrides.
 * @param double - The fetch double.
 * @returns The provider.
 */
function makeProvider(
  config: FlyioConfig = {},
  double: ReturnType<typeof createFetchDouble> = createFetchDouble(),
) {
  const client = new FlyApiClient({
    token: () => 'tok',
    baseUrl: 'https://api.machines.dev/v1',
    fetchImpl: double.fetch,
    sleep: async () => {},
  })
  return createProvider({ orgSlug: 'acme', region: 'iad', ...config }, client)
}

/**
 * Queues the happy-path responses for a `create()` with no volume.
 * @param double - The fetch double.
 * @param machineId - Machine id to return.
 * @returns The same double, for chaining.
 */
function queueCreate(double: ReturnType<typeof createFetchDouble>, machineId = 'm1') {
  return double
    .on(`GET /apps/${APP}`, { status: 404, body: { error: 'not found' } })
    .on('POST /apps', { status: 201, body: {} })
    .on(`POST /apps/${APP}/machines`, { body: { id: machineId, state: 'started' } })
}

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('create — app provisioning and tenant isolation', () => {
  it('creates one app per project on its OWN custom 6PN network', async () => {
    const double = queueCreate(createFetchDouble())
    await makeProvider({}, double).create({ projectId: PROJECT_ID })

    const createApp = double.matching('POST /apps')[0]
    expect(createApp.body).toEqual({ name: APP, org_slug: 'acme', network: APP })
  })

  it('reuses an app that already exists and never tries to change its network', async () => {
    const double = createFetchDouble()
      .on(`GET /apps/${APP}`, { body: { name: APP, network: 'legacy' } })
      .on(`POST /apps/${APP}/machines`, { body: { id: 'm1', state: 'started' } })

    await makeProvider({}, double).create({ projectId: PROJECT_ID })

    expect(double.matching('POST /apps').filter((call) => call.path === '/apps')).toHaveLength(0)
  })

  it('waits for the Machine to reach started before returning, so the first exec is not 412', async () => {
    // POST .../machines returns as soon as the Machine is SCHEDULED (state
    // `created`), not running. Without the wait, the caller's first exec fails
    // with `412 machine not running` — the production bug this guards.
    const double = createFetchDouble()
      .on(`GET /apps/${APP}`, { status: 404, body: {} })
      .on('POST /apps', { status: 201, body: {} })
      .on(`POST /apps/${APP}/machines`, { body: { id: 'm1', state: 'created' } })

    const sandbox = await makeProvider({}, double).create({ projectId: PROJECT_ID })

    expect(double.matching(`GET /apps/${APP}/machines/m1/wait`)).toHaveLength(1)
    expect(sandbox.status).toBe('running')
  })

  it('treats a concurrent 409 on app creation as success', async () => {
    const double = createFetchDouble()
      .on(`GET /apps/${APP}`, { status: 404, body: {} })
      .on('POST /apps', { status: 409, body: { error: 'name taken' } })
      .on(`POST /apps/${APP}/machines`, { body: { id: 'm1', state: 'started' } })

    const sandbox = await makeProvider({}, double).create({ projectId: PROJECT_ID })
    expect(sandbox.id).toBe(`${APP}:m1`)
  })

  it('refuses shared-app mode in production — it puts every tenant on one 6PN', async () => {
    process.env.NODE_ENV = 'production'
    const provider = makeProvider({ appPerProject: false, appName: 'shared' })
    await expect(provider.create({ projectId: PROJECT_ID })).rejects.toThrow(
      /forbidden in production/,
    )
  })

  it('warns loudly but allows shared-app mode outside production', async () => {
    process.env.NODE_ENV = 'development'
    const double = createFetchDouble()
      .on('GET /apps/shared', { body: { name: 'shared' } })
      .on('POST /apps/shared/machines', { body: { id: 'm1', state: 'started' } })

    const sandbox = await makeProvider({ appPerProject: false, appName: 'shared' }, double).create({
      projectId: PROJECT_ID,
    })

    expect(sandbox.id).toBe('shared:m1')
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('shared-app mode'),
      expect.anything(),
    )
  })

  it('requires an app name in shared-app mode', async () => {
    process.env.NODE_ENV = 'development'
    delete process.env.FLY_SANDBOX_APP
    const provider = makeProvider({ appPerProject: false })
    await expect(provider.create({ projectId: PROJECT_ID })).rejects.toThrow(
      /Shared-app mode needs an app name/,
    )
  })
})

describe('create — Machine configuration', () => {
  it('sets the guest, image, region and managed metadata', async () => {
    const double = queueCreate(createFetchDouble())
    await makeProvider({ baseImage: 'registry.fly.io/molecule-sandbox:latest' }, double).create({
      projectId: PROJECT_ID,
      env: { NODE_ENV: 'development' },
      resources: { cpu: 2, memoryMB: 2048, diskMB: 0 },
    })

    const body = double.matching(`POST /apps/${APP}/machines`)[0].body as {
      region: string
      config: Record<string, unknown>
    }
    expect(body.region).toBe('iad')
    expect(body.config.image).toBe('registry.fly.io/molecule-sandbox:latest')
    expect(body.config.guest).toEqual({ cpus: 2, cpu_kind: 'shared', memory_mb: 2048 })
    expect(body.config.env).toEqual({ NODE_ENV: 'development' })
    expect(body.config.metadata).toMatchObject({
      'molecule-sandbox.projectId': PROJECT_ID,
      'molecule-sandbox.managed': 'true',
    })
    expect(body.config.restart).toEqual({ policy: 'no' })
    expect(body.config.auto_destroy).toBe(false)
  })

  it('attaches a preview service with autostop=suspend — the scale-to-zero default', async () => {
    const double = queueCreate(createFetchDouble())
    await makeProvider({}, double).create({ projectId: PROJECT_ID })

    const body = double.matching(`POST /apps/${APP}/machines`)[0].body as {
      config: { services: Array<Record<string, unknown>> }
    }
    expect(body.config.services).toHaveLength(1)
    expect(body.config.services[0]).toMatchObject({
      protocol: 'tcp',
      internal_port: 5173,
      autostart: true,
      autostop: 'suspend',
      min_machines_running: 0,
    })
    expect(body.config.services[0].ports).toEqual([
      { port: 80, handlers: ['http'], force_https: true },
      { port: 443, handlers: ['tls', 'http'] },
    ])
  })

  it('omits the public service when publicService is off', async () => {
    const double = queueCreate(createFetchDouble())
    await makeProvider({ publicService: false }, double).create({ projectId: PROJECT_ID })

    const body = double.matching(`POST /apps/${APP}/machines`)[0].body as {
      config: { services?: unknown }
    }
    expect(body.config.services).toBeUndefined()
  })

  it('honors a configured autostop mode', async () => {
    const double = queueCreate(createFetchDouble())
    await makeProvider({ autostop: 'stop' }, double).create({ projectId: PROJECT_ID })
    const body = double.matching(`POST /apps/${APP}/machines`)[0].body as {
      config: { services: Array<{ autostop: string }> }
    }
    expect(body.config.services[0].autostop).toBe('stop')
  })

  it('merges caller labels but never lets them clobber the managed keys', async () => {
    const double = queueCreate(createFetchDouble())
    await makeProvider({}, double).create({
      projectId: PROJECT_ID,
      labels: {
        'molecule.production': PROJECT_ID,
        'molecule-sandbox.managed': 'false',
        'molecule-sandbox.projectId': 'other',
      },
    })

    const body = double.matching(`POST /apps/${APP}/machines`)[0].body as {
      config: { metadata: Record<string, string> }
    }
    expect(body.config.metadata['molecule.production']).toBe(PROJECT_ID)
    expect(body.config.metadata['molecule-sandbox.managed']).toBe('true')
    expect(body.config.metadata['molecule-sandbox.projectId']).toBe(PROJECT_ID)
  })

  it('throws when the API returns no Machine id instead of yielding a broken sandbox', async () => {
    const double = createFetchDouble()
      .on(`GET /apps/${APP}`, { body: { name: APP } })
      .on(`POST /apps/${APP}/machines`, { body: {} })
    await expect(makeProvider({}, double).create({ projectId: PROJECT_ID })).rejects.toThrow(
      /returned no Machine id/,
    )
  })
})

describe('create — volumes', () => {
  it('provisions the volume in the project app and mounts it at /workspace', async () => {
    const double = queueCreate(createFetchDouble())
      .on(`GET /apps/${APP}/volumes`, { body: [] })
      .on(`POST /apps/${APP}/volumes`, { body: { id: 'vol_123', name: 'mol_abc' } })

    await makeProvider({}, double).create({ projectId: PROJECT_ID, volumeName: 'mol-abc' })

    const createVolume = double.matching(`POST /apps/${APP}/volumes`)[0]
    // Fly requires [a-z0-9_] and <= 30 chars for volume names; hyphens become
    // underscores.
    expect(createVolume.body).toEqual({
      name: 'mol_abc',
      region: 'iad',
      size_gb: 10,
      encrypted: true,
    })

    const body = double.matching(`POST /apps/${APP}/machines`)[0].body as {
      config: { mounts: Array<{ volume: string; path: string }> }
    }
    expect(body.config.mounts).toEqual([{ volume: 'vol_123', path: '/workspace' }])
  })

  it("sanitizes a mol-<uuid> volume name to lowercase [a-z0-9_] within Fly's 30-char limit", async () => {
    // The real caller passes `mol-<projectId>` (40 chars with hyphens); Fly
    // rejects that with 400 "name only allows lowercase alphanumeric characters
    // and underscores with at most 30 characters" — the bug this guards.
    const double = queueCreate(createFetchDouble())
      .on(`GET /apps/${APP}/volumes`, { body: [] })
      .on(`POST /apps/${APP}/volumes`, { body: { id: 'vol_x', name: 'x' } })

    await makeProvider({}, double).create({
      projectId: PROJECT_ID,
      volumeName: 'mol-536630B1-7950-4b28-AA72-ae97d1fbe669',
    })

    const name = (double.matching(`POST /apps/${APP}/volumes`)[0].body as { name: string }).name
    expect(name).toMatch(/^[a-z0-9_]+$/)
    expect(name.length).toBeLessThanOrEqual(30)
  })

  it('produces a stable, deterministic volume name for the same input', async () => {
    const run = async () => {
      const double = queueCreate(createFetchDouble())
        .on(`GET /apps/${APP}/volumes`, { body: [] })
        .on(`POST /apps/${APP}/volumes`, { body: { id: 'vol_x', name: 'x' } })
      await makeProvider({}, double).create({
        projectId: PROJECT_ID,
        volumeName: 'mol-536630b1-7950-4b28-aa72-ae97d1fbe669',
      })
      return (double.matching(`POST /apps/${APP}/volumes`)[0].body as { name: string }).name
    }
    expect(await run()).toBe(await run())
  })

  it('rounds diskMB UP to whole GB, since Fly volumes are sized in GB', async () => {
    const double = queueCreate(createFetchDouble())
      .on(`GET /apps/${APP}/volumes`, { body: [] })
      .on(`POST /apps/${APP}/volumes`, { body: { id: 'vol_1', name: 'v' } })

    await makeProvider({}, double).create({
      projectId: PROJECT_ID,
      volumeName: 'v',
      resources: { cpu: 1, memoryMB: 512, diskMB: 3500 },
    })

    expect(
      (double.matching(`POST /apps/${APP}/volumes`)[0].body as { size_gb: number }).size_gb,
    ).toBe(4)
  })

  it('reuses an existing volume by name and skips destroyed ones', async () => {
    const double = queueCreate(createFetchDouble()).on(`GET /apps/${APP}/volumes`, {
      body: [
        { id: 'vol_dead', name: 'mol_abc', state: 'destroyed' },
        { id: 'vol_live', name: 'mol_abc', state: 'created' },
      ],
    })

    await makeProvider({}, double).create({ projectId: PROJECT_ID, volumeName: 'mol-abc' })

    expect(double.matching(`POST /apps/${APP}/volumes`)).toHaveLength(0)
    const body = double.matching(`POST /apps/${APP}/machines`)[0].body as {
      config: { mounts: Array<{ volume: string }> }
    }
    expect(body.config.mounts[0].volume).toBe('vol_live')
  })

  it('does not implement the optional volume methods — they carry no app or region', () => {
    const provider = makeProvider()
    expect(provider.createVolume).toBeUndefined()
    expect(provider.removeVolume).toBeUndefined()
    expect(provider.volumeExists).toBeUndefined()
  })
})

describe('lifecycle mapping', () => {
  /**
   * Builds a sandbox bound to an existing Machine.
   * @param double - The fetch double.
   * @param state - Machine state to report.
   * @returns The sandbox.
   */
  async function getSandbox(double: ReturnType<typeof createFetchDouble>, state = 'started') {
    double.on(`GET /apps/${APP}/machines/m1`, { body: { id: 'm1', state } })
    const sandbox = await makeProvider({}, double).get(`${APP}:m1`)
    if (!sandbox) throw new Error('expected a sandbox')
    return sandbox
  }

  it('sleep() SUSPENDS the Machine — a memory snapshot, not a stop', async () => {
    const double = createFetchDouble()
    const sandbox = await getSandbox(double)

    await sandbox.sleep()

    expect(double.matching(`POST /apps/${APP}/machines/m1/suspend`)).toHaveLength(1)
    expect(double.matching(`POST /apps/${APP}/machines/m1/stop`)).toHaveLength(0)
    expect(sandbox.status).toBe('sleeping')
  })

  it('wake() STARTS the Machine — Fly has no separate resume endpoint', async () => {
    const double = createFetchDouble()
    const sandbox = await getSandbox(double, 'suspended')
    expect(sandbox.status).toBe('sleeping')

    await sandbox.wake()

    expect(double.matching(`POST /apps/${APP}/machines/m1/start`)).toHaveLength(1)
    expect(sandbox.status).toBe('running')
  })

  it('stop() is a real stop, distinct from sleep', async () => {
    const double = createFetchDouble()
    const sandbox = await getSandbox(double)

    await sandbox.stop()

    expect(double.matching(`POST /apps/${APP}/machines/m1/stop`)).toHaveLength(1)
    expect(double.matching(`POST /apps/${APP}/machines/m1/suspend`)).toHaveLength(0)
    expect(sandbox.status).toBe('stopped')
  })

  it('start() tolerates an already-running Machine by re-reading its state', async () => {
    const double = createFetchDouble()
      .on(`GET /apps/${APP}/machines/m1`, { body: { id: 'm1', state: 'started' } })
      .on(`POST /apps/${APP}/machines/m1/start`, {
        status: 412,
        body: { error: 'already started' },
      })
      .on(`GET /apps/${APP}/machines/m1`, { body: { id: 'm1', state: 'started' } })

    const provider = makeProvider({}, double)
    const sandbox = await provider.get(`${APP}:m1`)
    await expect(sandbox?.start()).resolves.toBeUndefined()
    expect(sandbox?.status).toBe('running')
  })

  it('rethrows a start failure when the Machine really is not running', async () => {
    const double = createFetchDouble().fallback({
      status: 200,
      body: { id: 'm1', state: 'stopped' },
    })
    // 5xx is retryable, so every attempt in the client's budget must fail.
    for (let i = 0; i < 8; i++) {
      double.on(`POST /apps/${APP}/machines/m1/start`, {
        status: 500,
        body: { error: 'no capacity' },
      })
    }

    const sandbox = await makeProvider({}, double).get(`${APP}:m1`)
    await expect(sandbox?.start()).rejects.toThrow(/no capacity/)
  })
})

describe('get / list / destroy', () => {
  it('returns null for a Machine that no longer exists', async () => {
    const double = createFetchDouble().on(`GET /apps/${APP}/machines/gone`, {
      status: 404,
      body: {},
    })
    await expect(makeProvider({}, double).get(`${APP}:gone`)).resolves.toBeNull()
  })

  it('returns null for a malformed sandbox id rather than guessing an app', async () => {
    const double = createFetchDouble()
    await expect(makeProvider({}, double).get('bare-machine-id')).resolves.toBeNull()
    expect(double.calls).toHaveLength(0)
    expect(mockLogger.warn).toHaveBeenCalled()
  })

  it('pages the org-wide listing and keeps only Machines this provider manages', async () => {
    const double = createFetchDouble()
      .on('GET /orgs/acme/machines', {
        body: {
          machines: [
            {
              id: 'm1',
              app_name: 'app-a',
              state: 'started',
              config: { metadata: { 'molecule-sandbox.managed': 'true' } },
            },
            { id: 'other', app_name: 'unrelated', state: 'started', config: { metadata: {} } },
          ],
          next_cursor: 'c2',
        },
      })
      .on('GET /orgs/acme/machines', {
        body: {
          machines: [
            {
              id: 'm2',
              app_name: 'app-b',
              state: 'suspended',
              config: { metadata: { 'molecule-sandbox.managed': 'true' } },
            },
          ],
          next_cursor: '',
        },
      })

    const sandboxes = await makeProvider({}, double).list('user-1')

    expect(sandboxes.map((s) => s.id)).toEqual(['app-a:m1', 'app-b:m2'])
    expect(sandboxes.map((s) => s.status)).toEqual(['running', 'sleeping'])
    expect(double.matching('GET /orgs/acme/machines')).toHaveLength(2)
    expect(double.calls[1].path).toContain('cursor=c2')
  })

  it('WARNS when the org listing is truncated, instead of returning a short list silently', async () => {
    // Fly keeps handing back a cursor: a caller reaping from a truncated list
    // would leave the unseen Machines running and billing forever.
    const double = createFetchDouble().fallback({
      body: {
        machines: [{ id: 'm', app_name: 'a', state: 'started', config: { metadata: {} } }],
        next_cursor: 'more',
      },
    })

    await makeProvider({}, double).list('user-1')

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('TRUNCATED'),
      expect.objectContaining({ org: 'acme' }),
    )
  })

  it('lists the shared app directly when per-project apps are off', async () => {
    process.env.NODE_ENV = 'development'
    const double = createFetchDouble().on('GET /apps/shared/machines', {
      body: [
        {
          id: 'm1',
          state: 'started',
          config: { metadata: { 'molecule-sandbox.managed': 'true' } },
        },
        { id: 'm2', state: 'started', config: { metadata: {} } },
      ],
    })

    const sandboxes = await makeProvider({ appPerProject: false, appName: 'shared' }, double).list(
      'user-1',
    )

    expect(sandboxes.map((s) => s.id)).toEqual(['shared:m1'])
    expect(double.matching('GET /orgs/acme/machines')).toHaveLength(0)
  })

  it('destroys the Machine AND the per-project app, which removes its volumes and 6PN', async () => {
    const double = createFetchDouble()
    await makeProvider({}, double).destroy(`${APP}:m1`)

    expect(double.matching(`DELETE /apps/${APP}/machines/m1`)[0].path).toContain('force=true')
    expect(double.matching(`DELETE /apps/${APP}`)).toHaveLength(2) // machine path is a prefix match
    expect(double.calls.at(-1)?.path).toBe(`/apps/${APP}`)
  })

  it('removes the Machine’s own volumes in shared-app mode', async () => {
    process.env.NODE_ENV = 'development'
    const double = createFetchDouble().on('GET /apps/shared/machines/m1', {
      body: { id: 'm1', state: 'stopped', config: { mounts: [{ volume: 'vol_1', path: '/w' }] } },
    })

    await makeProvider({ appPerProject: false, appName: 'shared' }, double).destroy('shared:m1')

    expect(double.matching('DELETE /apps/shared/volumes/vol_1')).toHaveLength(1)
    expect(
      double.calls.some((call) => call.method === 'DELETE' && call.path === '/apps/shared'),
    ).toBe(false)
  })

  it('refuses to destroy from a malformed id', async () => {
    await expect(makeProvider().destroy('bare-id')).rejects.toThrow(/expected "<app>:<machineId>"/)
  })
})

describe('file operations', () => {
  /**
   * Builds a sandbox whose exec calls are answered by a handler over the script.
   * @param handler - Returns the exec response body for a script.
   * @returns The sandbox and the recorded scripts.
   */
  async function sandboxWithExec(
    handler: (script: string) => { stdout?: string; stderr?: string; exit_code?: number },
  ) {
    const scripts: string[] = []
    const fetchImpl = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input)
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      if (url.endsWith('/exec')) {
        const script = body.command[body.command.length - 1]
        scripts.push(script)
        return {
          status: 200,
          headers: { get: () => null },
          text: async () => JSON.stringify(handler(script)),
        } as unknown as Response
      }
      return {
        status: 200,
        headers: { get: () => null },
        text: async () => JSON.stringify({ id: 'm1', state: 'started' }),
      } as unknown as Response
    }) as unknown as typeof fetch

    const client = new FlyApiClient({
      token: () => 'tok',
      baseUrl: 'https://api.machines.dev/v1',
      fetchImpl,
      sleep: async () => {},
    })
    const sandbox = await createProvider({ orgSlug: 'acme' }, client).get(`${APP}:m1`)
    if (!sandbox) throw new Error('expected a sandbox')
    return { sandbox, scripts }
  }

  it('reads a file and shell-quotes the path', async () => {
    const { sandbox, scripts } = await sandboxWithExec(() => ({
      stdout: 'contents',
      exit_code: 0,
    }))
    await expect(sandbox.readFile("/workspace/it's.ts")).resolves.toBe('contents')
    expect(scripts[0]).toContain('cat ' + shellQuote("/workspace/it's.ts"))
  })

  it('throws with the stderr when a read fails', async () => {
    const { sandbox } = await sandboxWithExec(() => ({
      stderr: 'No such file',
      exit_code: 1,
    }))
    await expect(sandbox.readFile('/workspace/missing.ts')).rejects.toThrow(
      /Failed to read \/workspace\/missing.ts: No such file/,
    )
  })

  it('writes a small file in one exec, creating the parent directory', async () => {
    const { sandbox, scripts } = await sandboxWithExec(() => ({ exit_code: 0 }))
    await sandbox.writeFile('/workspace/src/a.ts', 'hello')

    const write = scripts.filter((script) => script.includes('base64 -d'))
    expect(write).toHaveLength(1)
    expect(write[0]).toContain('mkdir -p "$(dirname')
    expect(write[0]).toContain(Buffer.from('hello').toString('base64'))
    expect(write[0]).toContain('> ')
  })

  it('chunks a large file into truncate-then-append execs, under MAX_ARG_STRLEN', async () => {
    const { sandbox, scripts } = await sandboxWithExec(() => ({ exit_code: 0 }))
    await sandbox.writeFile('/workspace/big.txt', 'a'.repeat(120_000))

    const write = scripts.filter((script) => script.includes('base64 -d'))
    expect(write.length).toBeGreaterThan(1)
    expect(write[0]).toContain('> ')
    for (const script of write.slice(1)) {
      expect(script).toContain('>> ')
      expect(script).not.toContain('mkdir -p')
    }
    for (const script of write) expect(script.length).toBeLessThan(128 * 1024)
  })

  it('throws when a write fails instead of reporting success', async () => {
    const { sandbox } = await sandboxWithExec(() => ({ stderr: 'read-only fs', exit_code: 1 }))
    await expect(sandbox.writeFile('/workspace/a.ts', 'x')).rejects.toThrow(/Failed to write/)
  })

  it('parses readDir output, including symlink targets, and drops . and ..', async () => {
    const listing = [
      'total 12',
      'drwxr-xr-x 2 root root 4096 1700000000 .',
      'drwxr-xr-x 3 root root 4096 1700000000 ..',
      'drwxr-xr-x 2 root root 4096 1700000000 src',
      '-rw-r--r-- 1 root root  128 1700000000 index.ts',
      'lrwxrwxrwx 1 root root   16 1700000000 workspace -> /sandbox/project',
    ].join('\n')
    const { sandbox, scripts } = await sandboxWithExec(() => ({ stdout: listing, exit_code: 0 }))

    await expect(sandbox.readDir('/workspace')).resolves.toEqual([
      { name: 'src', type: 'directory', size: undefined },
      { name: 'index.ts', type: 'file', size: 128 },
      {
        name: 'workspace',
        type: 'file',
        size: 16,
        symlinkTarget: '/sandbox/project',
      },
    ])
    // Trailing slash so `ls` follows a symlinked directory, and NO pipeline —
    // a pipe would report tail's status and mask a missing directory.
    const lsLine = scripts[0].split('\n').find((line) => line.startsWith('ls ')) as string
    expect(lsLine).toContain("'/workspace/'")
    expect(lsLine).not.toContain('|')
  })

  it('THROWS on a missing directory — an empty array would read as "exists and empty"', async () => {
    const { sandbox } = await sandboxWithExec(() => ({
      stderr: 'No such file or directory',
      exit_code: 2,
    }))
    await expect(sandbox.readDir('/workspace/nope')).rejects.toThrow(/Failed to list/)
  })

  it('deletes a path and surfaces a failure', async () => {
    const { sandbox, scripts } = await sandboxWithExec((script) =>
      script.includes('/protected') ? { stderr: 'denied', exit_code: 1 } : { exit_code: 0 },
    )
    await expect(sandbox.deleteFile('/workspace/a.ts')).resolves.toBeUndefined()
    expect(scripts[0]).toContain("rm -rf '/workspace/a.ts'")
    await expect(sandbox.deleteFile('/protected')).rejects.toThrow(/Failed to delete/)
  })
})

describe('preview URL', () => {
  it('defaults to the public per-app fly.dev hostname', async () => {
    const double = createFetchDouble().on(`GET /apps/${APP}/machines/m1`, {
      body: { id: 'm1', state: 'started' },
    })
    const sandbox = await makeProvider({}, double).get(`${APP}:m1`)
    expect(sandbox?.previewUrl).toBe(`https://${APP}.fly.dev`)
    expect(sandbox?.getPreviewUrl()).toBe(`https://${APP}.fly.dev`)
  })

  it('substitutes {app}, {machineId} and {port} globally, e.g. for the private 6PN form', async () => {
    const double = createFetchDouble().on(`GET /apps/${APP}/machines/m1`, {
      body: { id: 'm1', state: 'started' },
    })
    const sandbox = await makeProvider(
      { previewUrlTemplate: 'http://{machineId}.vm.{app}.internal:{port}/{port}' },
      double,
    ).get(`${APP}:m1`)

    expect(sandbox?.getPreviewUrl(4000)).toBe(`http://m1.vm.${APP}.internal:4000/4000`)
    expect(sandbox?.getPreviewUrl()).toBe(`http://m1.vm.${APP}.internal:5173/5173`)
  })
})

describe('admitted gaps', () => {
  it('does not implement spawn — Fly exec has no streaming or connection upgrade', async () => {
    const double = createFetchDouble().on(`GET /apps/${APP}/machines/m1`, {
      body: { id: 'm1', state: 'started' },
    })
    const sandbox = await makeProvider({}, double).get(`${APP}:m1`)
    expect(sandbox?.spawn).toBeUndefined()
  })

  it('onFileChange never fires and returns a real no-op unsubscribe, warning once', async () => {
    const double = createFetchDouble()
      .on(`GET /apps/${APP}/machines/m1`, { body: { id: 'm1', state: 'started' } })
      .on(`GET /apps/${APP}/machines/m2`, { body: { id: 'm2', state: 'started' } })
    const provider = makeProvider({}, double)

    const a = await provider.get(`${APP}:m1`)
    const b = await provider.get(`${APP}:m2`)
    const callback = vi.fn()
    const unsubscribe = a?.onFileChange(callback)
    b?.onFileChange(callback)

    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(callback).not.toHaveBeenCalled()
    expect(() => unsubscribe?.()).not.toThrow()

    const warnings = mockLogger.warn.mock.calls.filter((call) =>
      String(call[0]).includes('onFileChange is not supported'),
    )
    expect(warnings).toHaveLength(1)
  })
})

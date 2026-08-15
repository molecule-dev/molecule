import { describe, expect, it, vi } from 'vitest'

import { E2BSandboxProvider } from '../provider.js'
import type { E2BSandboxClientLike, E2BSandboxInfoLike, E2BSandboxLike } from '../types.js'

// ---------------------------------------------------------------------------
// An E2B microVM is the ONLY copy of a project's files. These tests pin the
// three consequences of that:
//
//   • `get()` may answer `null` only for a sandbox that does not exist — a
//     failed lookup throws, because a caller reads `null` as "gone" and rebuilds
//     the project from a template;
//   • `describe()` reads the record instead of connecting, so a status poll
//     cannot resume (and start billing for) a hibernated sandbox;
//   • `create()` asks E2B to PAUSE at the timeout, not to kill — the default
//     would destroy a sandbox nobody touched for an hour, files included.
// ---------------------------------------------------------------------------

/** The SDK's not-found shape: a distinct class whose `name` it sets explicitly. */
class FakeSandboxNotFoundError extends Error {
  constructor(message = 'Sandbox not found') {
    super(message)
    this.name = 'SandboxNotFoundError'
  }
}

/** A minimal live sandbox; only the surface these tests touch is populated. */
function fakeSandbox(sandboxId: string): E2BSandboxLike {
  return {
    sandboxId,
    commands: {
      async run() {
        return { stdout: '', stderr: '', exitCode: 0 }
      },
    },
    files: {
      read: (async () => '') as E2BSandboxLike['files']['read'],
      async write() {
        return {}
      },
      async list() {
        return []
      },
      async remove() {},
    },
    getHost: (port) => `${port}-${sandboxId}.e2b.app`,
    async setTimeout() {},
    async kill() {},
  }
}

/** Build a provider over a client whose behaviour each test dictates. */
function providerWith(overrides: Partial<E2BSandboxClientLike>): {
  provider: E2BSandboxProvider
  calls: string[]
} {
  const calls: string[] = []
  const client: E2BSandboxClientLike = {
    async create(templateId) {
      calls.push('create')
      void templateId
      return fakeSandbox('sbx-new')
    },
    async connect(id) {
      calls.push('connect')
      return fakeSandbox(id)
    },
    async list() {
      calls.push('list')
      return []
    },
    isNotFound: (error) => error instanceof FakeSandboxNotFoundError,
    ...overrides,
  }
  return { provider: new E2BSandboxProvider({ apiKey: 'test' }, client), calls }
}

describe('get() — null means gone, and nothing else', () => {
  it('returns a handle for a sandbox that connects', async () => {
    const { provider } = providerWith({})
    await expect(provider.get('sbx-1')).resolves.toMatchObject({ id: 'sbx-1' })
  })

  it('returns null for a POSITIVE not-found', async () => {
    const { provider } = providerWith({
      async connect() {
        throw new FakeSandboxNotFoundError()
      },
    })
    await expect(provider.get('sbx-1')).resolves.toBeNull()
  })

  it('THROWS on a transient failure instead of reporting the sandbox gone', async () => {
    const { provider } = providerWith({
      async connect() {
        throw new Error('503 Service Unavailable')
      },
    })
    await expect(provider.get('sbx-1')).rejects.toThrow('503')
  })

  it('classifies a not-found by name when the client cannot compare classes', async () => {
    const { provider } = providerWith({
      isNotFound: undefined,
      async connect() {
        throw new FakeSandboxNotFoundError()
      },
    })
    await expect(provider.get('sbx-1')).resolves.toBeNull()
  })
})

describe('describe() — look without waking', () => {
  const info = (over: Partial<E2BSandboxInfoLike> = {}): E2BSandboxInfoLike => ({
    sandboxId: 'sbx-1',
    templateId: 'molecule-superset',
    state: 'running',
    metadata: { projectId: 'proj-1' },
    startedAt: new Date('2026-08-15T10:00:00.000Z'),
    endAt: new Date('2026-08-15T11:00:00.000Z'),
    ...over,
  })

  it('reads the record and never connects', async () => {
    const { provider, calls } = providerWith({
      async getInfo() {
        calls.push('getInfo')
        return info()
      },
    })

    const descriptor = await provider.describe!('sbx-1')

    expect(descriptor).toMatchObject({
      id: 'sbx-1',
      projectId: 'proj-1',
      status: 'running',
      templateRef: 'molecule-superset',
      startedAt: '2026-08-15T10:00:00.000Z',
    })
    expect(calls).toContain('getInfo')
    // The whole point: a status check must not resume a paused sandbox.
    expect(calls).not.toContain('connect')
  })

  it('reports a paused sandbox as sleeping, not stopped', async () => {
    const { provider } = providerWith({
      async getInfo() {
        return info({ state: 'paused' })
      },
    })
    // `sleeping` is what tells a caller the process tree comes back on resume.
    await expect(provider.describe!('sbx-1')).resolves.toMatchObject({ status: 'sleeping' })
  })

  it('returns null for a POSITIVE not-found', async () => {
    const { provider } = providerWith({
      async getInfo() {
        throw new FakeSandboxNotFoundError()
      },
    })
    await expect(provider.describe!('sbx-1')).resolves.toBeNull()
  })

  it('THROWS on a transient failure — a failed look is not an absence', async () => {
    const { provider } = providerWith({
      async getInfo() {
        throw new Error('ETIMEDOUT')
      },
    })
    await expect(provider.describe!('sbx-1')).rejects.toThrow('ETIMEDOUT')
  })

  it('refuses rather than reporting "no such sandbox" when it cannot look at all', async () => {
    const { provider } = providerWith({ getInfo: undefined })
    await expect(provider.describe!('sbx-1')).rejects.toThrow(/getInfo/)
  })

  it('carries the volume mount through when the account uses one', async () => {
    const { provider } = providerWith({
      async getInfo() {
        return info({ volumeMounts: [{ name: 'mol-project-1', path: '/workspace' }] })
      },
    })
    await expect(provider.describe!('sbx-1')).resolves.toMatchObject({
      volumeName: 'mol-project-1',
    })
  })
})

describe('create() — pause at the timeout, never kill', () => {
  it('asks E2B to pause with a memory snapshot', async () => {
    let opts: Record<string, unknown> | undefined
    const { provider } = providerWith({
      async create(_templateId, o) {
        opts = o
        return fakeSandbox('sbx-new')
      },
    })

    await provider.create({ projectId: 'proj-1', env: {} })

    // E2B's default is onTimeout:'kill' — which would destroy the only copy of
    // the project's files an hour after the last touch.
    expect(opts?.lifecycle).toEqual({ onTimeout: { action: 'pause', keepMemory: true } })
    // keepMemory is what makes resume() honest about processesPreserved.
    expect(opts?.metadata).toMatchObject({ projectId: 'proj-1' })
  })
})

describe('list() — enumerating an account must not wake it', () => {
  it('skips paused sandboxes rather than connecting to them', async () => {
    const { provider, calls } = providerWith({
      async list() {
        return [
          { sandboxId: 'sbx-running', state: 'running' },
          { sandboxId: 'sbx-paused', state: 'paused' },
        ]
      },
    })

    const handles = await provider.list('user-1')

    expect(handles.map((h) => h.id)).toEqual(['sbx-running'])
    expect(calls.filter((c) => c === 'connect')).toHaveLength(1)
  })
})

describe('hibernate() — pause or throw, never a silent noop', () => {
  /** A live sandbox whose pause surface each test dictates. */
  function pausableSandbox(over: Partial<E2BSandboxLike>): E2BSandboxLike {
    return { ...fakeSandbox('sbx-1'), ...over }
  }

  it('pauses through the SDK and reports the memory-snapshot mechanism', async () => {
    const pause = vi.fn(async () => true)
    const sbx = pausableSandbox({ pause })
    const { provider } = providerWith({
      async connect() {
        return sbx
      },
    })

    const handle = await provider.get('sbx-1')
    await expect(handle!.hibernate!()).resolves.toMatchObject({
      processesPreserved: true,
      mechanism: 'pause',
    })
    expect(pause).toHaveBeenCalled()
    expect(handle!.status).toBe('sleeping')
  })

  it('THROWS when the SDK build exposes no pause at all', async () => {
    // The old behaviour returned `{ mechanism: 'noop', processesPreserved: true }`
    // here — a success-shaped answer for a sandbox that is still running, which
    // the caller then records as stopped. It must fail loudly instead.
    const sbx = pausableSandbox({ pause: undefined, betaPause: undefined })
    const { provider } = providerWith({
      async connect() {
        return sbx
      },
    })

    const handle = await provider.get('sbx-1')
    await expect(handle!.hibernate!()).rejects.toThrow(/neither pause\(\) nor betaPause\(\)/)
    expect(handle!.status).not.toBe('sleeping')
  })

  it('propagates a failed pause instead of reporting success', async () => {
    const sbx = pausableSandbox({
      async pause() {
        throw new Error('502 Bad Gateway')
      },
    })
    const { provider } = providerWith({
      async connect() {
        return sbx
      },
    })

    const handle = await provider.get('sbx-1')
    await expect(handle!.hibernate!()).rejects.toThrow('502')
  })

  it('treats an ALREADY-paused sandbox as success and says so', async () => {
    // The SDK resolves `false` for the API's 409 — the requested end state.
    const sbx = pausableSandbox({ pause: async () => false })
    const { provider } = providerWith({
      async connect() {
        return sbx
      },
    })

    const handle = await provider.get('sbx-1')
    await expect(handle!.hibernate!()).resolves.toMatchObject({
      mechanism: 'pause',
      detail: 'the sandbox was already paused',
    })
  })

  it('falls back to the deprecated betaPause when only that exists', async () => {
    const betaPause = vi.fn(async () => true)
    const sbx = pausableSandbox({ pause: undefined, betaPause })
    const { provider } = providerWith({
      async connect() {
        return sbx
      },
    })

    await (await provider.get('sbx-1'))!.hibernate!()
    expect(betaPause).toHaveBeenCalled()
  })

  it('stop() and sleep() route through the same pause, so neither can no-op', async () => {
    const pause = vi.fn(async () => true)
    const { provider } = providerWith({
      async connect() {
        return pausableSandbox({ pause })
      },
    })

    await (await provider.get('sbx-1'))!.stop()
    await (await provider.get('sbx-1'))!.sleep()
    expect(pause).toHaveBeenCalledTimes(2)
  })
})

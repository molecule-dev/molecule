import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Sandbox } from '@molecule/api-code-sandbox'

import { E2BSandboxProvider } from '../provider.js'
import { snapshotsSettled, withSnapshotGate } from '../snapshot-gate.js'
import type {
  E2BCommandHandleLike,
  E2BSandboxClientLike,
  E2BSandboxLike,
  E2BSnapshotLike,
} from '../types.js'

// ---------------------------------------------------------------------------
// An E2B snapshot pauses the sandbox while it is taken. A call that reaches E2B
// in that window is refused — measured live on 2026-11-05 as
// `SandboxNotRunningError: [unavailable] The sandbox was not found` for two of
// 41 commands issued while one 1.4 s snapshot ran. The fake below behaves the
// same way: while a snapshot of a sandbox is in progress, every command, file
// call, info read and connect for that sandbox is refused.
//
// The bond's answer is a per-sandbox gate: calls issued by this process wait for
// its own snapshot of that sandbox to settle, and only that sandbox waits.
// ---------------------------------------------------------------------------

/** The SDK's refusal for a sandbox that is not running at that moment. */
class FakeSandboxNotRunningError extends Error {
  constructor() {
    super('[unavailable] The sandbox was not found: The sandbox was killed or reached its timeout')
    this.name = 'SandboxNotRunningError'
  }
}

interface Deferred {
  promise: Promise<void>
  resolve(): void
  reject(error: Error): void
}

function deferred(): Deferred {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** Let every queued microtask and timer-free continuation run. */
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve()
  await new Promise((resolve) => setImmediate(resolve))
}

/**
 * A fake E2B account. `createSnapshot` pauses its sandbox until the test
 * releases (or fails) that snapshot; every call into a paused sandbox is
 * refused and recorded.
 */
function world() {
  const paused = new Set<string>()
  const refused: string[] = []
  const served: string[] = []
  const snapshotCalls: string[] = []
  const pending = new Map<string, Deferred[]>()
  const entered = new Map<string, Array<() => void>>()

  const guard = (id: string, what: string): void => {
    if (paused.has(id)) {
      refused.push(`${id} ${what}`)
      throw new FakeSandboxNotRunningError()
    }
    served.push(`${id} ${what}`)
  }

  const sandbox = (id: string): E2BSandboxLike =>
    ({
      sandboxId: id,
      commands: {
        run: (async (cmd: string, opts?: { background?: boolean }) => {
          guard(id, `run ${cmd}`)
          const handle: E2BCommandHandleLike = {
            pid: 7,
            wait: async () => ({ stdout: 'ok', stderr: '', exitCode: 0 }),
            sendStdin: async () => {
              guard(id, 'stdin')
            },
            kill: async () => {
              guard(id, 'process kill')
              return true
            },
          }
          return opts?.background ? handle : { stdout: 'ok', stderr: '', exitCode: 0 }
        }) as unknown as E2BSandboxLike['commands']['run'],
      },
      files: {
        read: (async (path: string, opts?: { format: string }) => {
          guard(id, `read ${path}`)
          return opts?.format === 'bytes' ? new TextEncoder().encode('contents') : 'contents'
        }) as E2BSandboxLike['files']['read'],
        async write(path: string) {
          guard(id, `write ${path}`)
          return {}
        },
        async list() {
          return []
        },
        async remove(path: string) {
          guard(id, `remove ${path}`)
        },
      },
      getHost: (port: number) => `${port}-${id}.e2b.app`,
      async setTimeout() {
        guard(id, 'setTimeout')
      },
      async kill() {
        guard(id, 'handle kill')
      },
      async pause() {
        guard(id, 'pause')
        return true
      },
      async updateNetwork() {
        guard(id, 'network')
      },
      pty: {
        async create() {
          guard(id, 'pty create')
          return {
            pid: 8,
            wait: async () => ({ stdout: '', stderr: '', exitCode: 0 }),
            sendStdin: async () => {},
            kill: async () => true,
          }
        },
        async sendInput() {
          guard(id, 'pty input')
        },
        async resize() {
          guard(id, 'pty resize')
        },
        async kill() {
          guard(id, 'pty kill')
          return true
        },
      },
    }) as unknown as E2BSandboxLike

  const client: E2BSandboxClientLike = {
    async create() {
      return sandbox('sbx-new')
    },
    async connect(id) {
      guard(id, 'connect')
      return sandbox(id)
    },
    async list() {
      return ['sbx-a', 'sbx-b'].map((sandboxId) => ({
        sandboxId,
        state: paused.has(sandboxId) ? 'paused' : 'running',
      }))
    },
    async kill(id) {
      guard(id, 'kill')
      return true
    },
    async getInfo(sandboxId) {
      served.push(`${sandboxId} getInfo`)
      // E2B reports the sandbox as paused while the snapshot is taken.
      return {
        sandboxId,
        state: paused.has(sandboxId) ? 'paused' : 'running',
        lifecycle: { autoResume: false },
      }
    },
    async createSnapshot(sandboxId, name): Promise<E2BSnapshotLike> {
      snapshotCalls.push(sandboxId)
      paused.add(sandboxId)
      const gate = deferred()
      pending.set(sandboxId, [...(pending.get(sandboxId) ?? []), gate])
      for (const notify of entered.get(sandboxId)?.splice(0) ?? []) notify()
      try {
        await gate.promise
        return { snapshotId: `molecules-project/${name}:default`, names: [String(name)] }
      } finally {
        paused.delete(sandboxId)
      }
    },
  }

  const provider = new E2BSandboxProvider({ apiKey: 'k', templateId: 'superset' }, client)

  return {
    provider,
    client,
    refused,
    served,
    snapshotCalls,
    /** Resolves once E2B has been asked for a snapshot of `id`. */
    snapshotStarted(id: string): Promise<void> {
      if (pending.get(id)?.length) return Promise.resolve()
      return new Promise((resolve) => entered.set(id, [...(entered.get(id) ?? []), resolve]))
    },
    /** Finish the oldest snapshot of `id`, successfully or with `error`. */
    finish(id: string, error?: Error): void {
      const gate = pending.get(id)?.shift()
      if (!gate) throw new Error(`no snapshot of ${id} is in progress`)
      if (error) gate.reject(error)
      else gate.resolve()
    },
  }
}

async function handle(w: ReturnType<typeof world>, id: string) {
  const sandbox = await w.provider.get(id)
  if (!sandbox) throw new Error('expected a sandbox handle')
  return sandbox
}

describe('E2B snapshot gate', () => {
  it('holds calls issued during a snapshot until it settles, so none is refused', async () => {
    const w = world()
    const sandbox = await handle(w, 'sbx-a')

    const commit = w.provider.commitTemplate({ sandboxId: 'sbx-a', templateId: 'shared-cache' })
    await w.snapshotStarted('sbx-a')
    const exec = sandbox.exec('echo ok')
    const read = sandbox.readFile('/workspace/app/package.json')
    const write = sandbox.writeFile('/workspace/app/.env', 'A=1')
    const keepAlive = sandbox.keepAlive?.(60_000)
    // Observe early rejections without changing the promises asserted below.
    void Promise.allSettled([exec, read, write, keepAlive])
    await settle()
    expect(w.served.filter((call) => call.startsWith('sbx-a') && call !== 'sbx-a connect')).toEqual(
      [],
    )

    w.finish('sbx-a')
    await expect(commit).resolves.toMatchObject({ id: 'shared-cache' })
    await expect(exec).resolves.toEqual({ stdout: 'ok', stderr: '', exitCode: 0 })
    await expect(read).resolves.toBe('contents')
    await expect(write).resolves.toBeUndefined()
    await keepAlive
    expect(w.refused).toEqual([])
  })

  it('a failed snapshot releases the calls it held and still reports its own error', async () => {
    const w = world()
    const sandbox = await handle(w, 'sbx-a')

    const commit = w.provider.commitTemplate({ sandboxId: 'sbx-a', templateId: 'shared-cache' })
    await w.snapshotStarted('sbx-a')
    const exec = sandbox.exec('echo ok')
    void Promise.allSettled([commit, exec])
    w.finish('sbx-a', new Error('snapshot quota exceeded'))

    await expect(commit).rejects.toThrow('snapshot quota exceeded')
    await expect(exec).resolves.toMatchObject({ exitCode: 0 })
    expect(w.refused).toEqual([])
  })

  it('does not hold another sandbox while one is being snapshotted', async () => {
    const w = world()
    const other = await handle(w, 'sbx-b')

    const commit = w.provider.commitTemplate({ sandboxId: 'sbx-a', templateId: 'shared-cache' })
    await w.snapshotStarted('sbx-a')
    // Resolves while sbx-a's snapshot is still in progress.
    await expect(other.exec('echo ok')).resolves.toMatchObject({ exitCode: 0 })

    w.finish('sbx-a')
    await commit
  })

  it('takes two snapshots of one sandbox one after the other', async () => {
    const w = world()
    const first = w.provider.commitTemplate({ sandboxId: 'sbx-a', templateId: 'one' })
    const second = w.provider.commitTemplate({ sandboxId: 'sbx-a', templateId: 'two' })
    await w.snapshotStarted('sbx-a')
    await settle()
    expect(w.snapshotCalls).toEqual(['sbx-a'])

    w.finish('sbx-a')
    await expect(first).resolves.toMatchObject({ id: 'one' })
    await w.snapshotStarted('sbx-a')
    expect(w.snapshotCalls).toEqual(['sbx-a', 'sbx-a'])
    w.finish('sbx-a')
    await expect(second).resolves.toMatchObject({ id: 'two' })
  })

  it('a lookup during the snapshot reports the sandbox as it is, not paused or gone', async () => {
    const w = world()
    const commit = w.provider.commitTemplate({ sandboxId: 'sbx-a', templateId: 'shared-cache' })
    await w.snapshotStarted('sbx-a')
    const described = w.provider.describe('sbx-a')
    const got = w.provider.get('sbx-a')
    void Promise.allSettled([described, got])

    w.finish('sbx-a')
    await commit
    await expect(described).resolves.toMatchObject({ id: 'sbx-a', status: 'running' })
    await expect(got).resolves.not.toBeNull()
    expect(w.refused).toEqual([])
  })
})

describe('snapshot gate SDK boundary coverage', () => {
  it('holds a handle call queued in the same turn as the snapshot', async () => {
    const w = world()
    const sandbox = await handle(w, 'sbx-a')
    const commit = w.provider.commitTemplate({ sandboxId: 'sbx-a', templateId: 'cache' })
    const outcome = sandbox.readFile('/workspace/file').then(
      (value) => ({ value }),
      (error) => ({ error }),
    )
    await w.snapshotStarted('sbx-a')
    await settle()
    w.finish('sbx-a')
    await commit
    expect(await outcome).toEqual({ value: 'contents' })
    expect(w.refused).toEqual([])
  })

  it.each(['write', 'kill', 'resize'] as const)(
    'holds an existing PTY handle %s',
    async (operation) => {
      const w = world()
      const sandbox = await handle(w, 'sbx-a')
      const process = await sandbox.spawn!('sh', { pty: { cols: 80, rows: 24 } })
      const commit = w.provider.commitTemplate({ sandboxId: 'sbx-a', templateId: 'cache' })
      await w.snapshotStarted('sbx-a')
      const before = w.served.length
      if (operation === 'write') process.write('hello')
      if (operation === 'kill') process.kill()
      if (operation === 'resize') process.resize!({ cols: 100, rows: 30 })
      await settle()
      const servedDuring = w.served.slice(before)
      w.finish('sbx-a')
      await commit
      await settle()
      expect(servedDuring).toEqual([])
      expect(w.refused).toEqual([])
      expect(w.served.slice(before)).toHaveLength(1)
    },
  )

  it.each(['write', 'kill'] as const)('holds an existing pipe handle %s', async (operation) => {
    const w = world()
    const sandbox = await handle(w, 'sbx-a')
    const process = await sandbox.spawn!('language-server')
    const commit = w.provider.commitTemplate({ sandboxId: 'sbx-a', templateId: 'cache' })
    await w.snapshotStarted('sbx-a')
    const before = w.served.length
    if (operation === 'write') process.write('hello')
    else process.kill()
    await settle()
    const servedDuring = w.served.slice(before)
    w.finish('sbx-a')
    await commit
    await settle()
    expect(servedDuring).toEqual([])
    expect(w.refused).toEqual([])
    expect(w.served.slice(before)).toHaveLength(1)
  })

  it.each([false, true])('holds destroy with static kill missing=%s', async (fallback) => {
    const w = world()
    if (fallback) delete w.client.kill
    const commit = w.provider.commitTemplate({ sandboxId: 'sbx-a', templateId: 'cache' })
    await w.snapshotStarted('sbx-a')
    const before = w.served.length
    const destroyed = w.provider.destroy('sbx-a').then(
      () => null,
      (error) => error,
    )
    await settle()
    const servedDuring = w.served.slice(before)
    w.finish('sbx-a')
    await commit
    expect(await destroyed).toBeNull()
    expect(servedDuring).toEqual([])
    expect(w.refused).toEqual([])
    expect(w.served.slice(before)).toContain(fallback ? 'sbx-a handle kill' : 'sbx-a kill')
  })

  it('does not omit a running sandbox whose listing row was paused by a snapshot', async () => {
    const w = world()
    const commit = w.provider.commitTemplate({ sandboxId: 'sbx-a', templateId: 'cache' })
    await w.snapshotStarted('sbx-a')
    const listed = w.provider.list('owner')
    await settle()
    w.finish('sbx-a')
    await commit
    expect((await listed).map((sandbox) => sandbox.id)).toEqual(['sbx-a', 'sbx-b'])
  })

  it('validates a queued snapshot only after the preceding snapshot settles', async () => {
    const w = world()
    const getInfo = w.client.getInfo!
    w.client.getInfo = async (id) => {
      if (w.snapshotCalls.length === 1) throw new FakeSandboxNotRunningError()
      return getInfo(id)
    }
    const first = w.provider.commitTemplate({ sandboxId: 'sbx-a', templateId: 'one' })
    await w.snapshotStarted('sbx-a')
    const second = w.provider
      .commitTemplate({ sandboxId: 'sbx-a', templateId: 'two', capturePaths: ['/workspace'] })
      .then(
        (value) => ({ value }),
        (error) => ({ error }),
      )
    await settle()
    // Once the first finishes, the control-plane preflight is available again.
    w.client.getInfo = getInfo
    w.finish('sbx-a')
    await first
    await settle()
    if (w.snapshotCalls.length === 2) w.finish('sbx-a')
    expect(await second).toMatchObject({ value: { id: 'two' } })
  })
})

describe('snapshot wait bounds', () => {
  afterEach(() => vi.useRealTimers())

  it('bounds a stuck snapshot wait without opening the gate or replaying the call', async () => {
    vi.useFakeTimers()
    const w = world()
    const sandbox = await handle(w, 'sbx-a')
    const commit = w.provider
      .commitTemplate({ sandboxId: 'sbx-a', templateId: 'cache' })
      .catch((error) => error)
    await w.snapshotStarted('sbx-a')
    let result: unknown = 'pending'
    const call = sandbox.exec('charge-card-once').then(
      (value) => {
        result = value
      },
      (error) => {
        result = error
      },
    )
    await vi.advanceTimersByTimeAsync(60_001)
    const observed = result
    expect(w.served).not.toContain('sbx-a run charge-card-once')
    w.finish('sbx-a')
    await commit
    await call
    expect(observed).toBeInstanceOf(Error)
    expect(String(observed)).toContain('snapshot')
    expect(w.served).not.toContain('sbx-a run charge-card-once')
    await expect(sandbox.exec('safe-next-command')).resolves.toMatchObject({ exitCode: 0 })
    expect(vi.getTimerCount()).toBe(0)
  })

  it('rechecks two snapshot waiters released by the same completion', async () => {
    const firstDone = deferred()
    const secondDone = deferred()
    const thirdDone = deferred()
    const entered: number[] = []
    const first = withSnapshotGate('queue-order', async () => {
      entered.push(1)
      await firstDone.promise
    })
    const second = withSnapshotGate('queue-order', async () => {
      entered.push(2)
      await secondDone.promise
    })
    const third = withSnapshotGate('queue-order', async () => {
      entered.push(3)
      await thirdDone.promise
    })
    firstDone.resolve()
    await first
    await settle()
    expect(entered).toEqual([1, 2])
    secondDone.resolve()
    await second
    await settle()
    expect(entered).toEqual([1, 2, 3])
    thirdDone.resolve()
    await third
    await snapshotsSettled('queue-order')
  })
})

describe('all sandbox SDK entry points', () => {
  const routes: Array<
    [string, (sandbox: Sandbox, w: ReturnType<typeof world>) => Promise<unknown>]
  > = [
    ['exec', (sandbox) => sandbox.exec('echo ok')],
    ['spawn pipes', (sandbox) => sandbox.spawn!('server')],
    ['spawn PTY', (sandbox) => sandbox.spawn!('sh', { pty: { cols: 80, rows: 24 } })],
    ['read text', (sandbox) => sandbox.readFile('/workspace/file')],
    ['write text', (sandbox) => sandbox.writeFile('/workspace/file', 'value')],
    ['read bytes', (sandbox) => sandbox.readFileBytes!('/workspace/file')],
    ['write bytes', (sandbox) => sandbox.writeFileBytes!('/workspace/file', new Uint8Array([1]))],
    ['read directory', (sandbox) => sandbox.readDir('/workspace')],
    ['delete', (sandbox) => sandbox.deleteFile('/workspace/file')],
    [
      'import',
      (sandbox) =>
        sandbox.importFiles!(
          '/workspace',
          (async function* () {
            yield new Uint8Array([1])
          })(),
        ),
    ],
    ['export', (sandbox) => sandbox.exportFiles!('/workspace/project')],
    ['keep alive', (sandbox) => sandbox.keepAlive!(60_000)],
    ['hibernate', (sandbox) => sandbox.hibernate!()],
    ['resume', (sandbox) => sandbox.resume!()],
    [
      'network',
      (sandbox) =>
        (sandbox as unknown as { applyNetwork(hosts: string[]): Promise<void> }).applyNetwork([
          'registry.npmjs.org',
        ]),
    ],
    ['get', (_sandbox, w) => w.provider.get('sbx-a')],
    ['describe', (_sandbox, w) => w.provider.describe('sbx-a')],
    [
      'passive read',
      async (_sandbox, w) => {
        const passive = await w.provider.readOnly('sbx-a')
        return passive?.readFileBytes!('/workspace/file')
      },
    ],
  ]

  it.each(routes)('holds %s issued while a snapshot runs', async (_name, call) => {
    const w = world()
    const sandbox = await handle(w, 'sbx-a')
    const commit = w.provider.commitTemplate({ sandboxId: 'sbx-a', templateId: 'cache' })
    await w.snapshotStarted('sbx-a')
    const before = w.served.length
    const result = call(sandbox, w).then(
      (value) => ({ value }),
      (error) => ({ error }),
    )
    await settle()
    const servedDuring = w.served.slice(before)
    w.finish('sbx-a')
    await commit
    expect(await result).not.toHaveProperty('error')
    expect(servedDuring).toEqual([])
    expect(w.refused).toEqual([])
    expect(w.served.length).toBeGreaterThan(before)
  })

  it('rechecks the gate after the passive-read status check', async () => {
    const w = world()
    await handle(w, 'sbx-a')
    const passive = await w.provider.readOnly('sbx-a')
    expect(passive).not.toBeNull()
    const getInfo = w.client.getInfo!
    let snapshot: Promise<unknown> | undefined
    w.client.getInfo = async (id) => {
      const info = await getInfo(id)
      snapshot = w.provider.commitTemplate({ sandboxId: id, templateId: 'cache' })
      return info
    }
    const result = passive!.readFileBytes!('/workspace/file').then(
      (value) => ({ value }),
      (error) => ({ error }),
    )
    await w.snapshotStarted('sbx-a')
    await settle()
    w.finish('sbx-a')
    await snapshot
    expect(await result).toEqual({ value: new TextEncoder().encode('contents') })
    expect(w.refused).toEqual([])
  })

  it('does not inspect or resume a genuinely paused sandbox when no local snapshot ran', async () => {
    const w = world()
    w.client.list = async () => [{ sandboxId: 'asleep', state: 'paused' }]
    const getInfo = vi.fn(async () => {
      throw new Error('info endpoint unavailable')
    })
    w.client.getInfo = getInfo
    const result = await w.provider.list('owner').then(
      (value) => ({ value }),
      (error) => ({ error }),
    )
    expect(result).toEqual({ value: [] })
    expect(getInfo).not.toHaveBeenCalled()
    expect(w.served).toEqual([])
  })

  it('rechecks a snapshot pause even when the snapshot starts and settles during the listing', async () => {
    const w = world()
    const list = w.client.list
    w.client.list = async (options) => {
      const commit = w.provider.commitTemplate({ sandboxId: 'sbx-a', templateId: 'cache' })
      await w.snapshotStarted('sbx-a')
      const rows = await list(options)
      w.finish('sbx-a')
      await commit
      return rows
    }
    expect((await w.provider.list('owner')).map((sandbox) => sandbox.id)).toEqual([
      'sbx-a',
      'sbx-b',
    ])
    expect(w.refused).toEqual([])
  })
})

describe('snapshot callback bounds', () => {
  afterEach(() => vi.useRealTimers())

  it('bounds the snapshot caller while keeping an unfinished snapshot excluded', async () => {
    vi.useFakeTimers()
    const w = world()
    let snapshotResult: unknown = 'pending'
    const commit = w.provider.commitTemplate({ sandboxId: 'sbx-a', templateId: 'cache' }).then(
      (value) => {
        snapshotResult = value
      },
      (error) => {
        snapshotResult = error
      },
    )
    await w.snapshotStarted('sbx-a')
    await vi.advanceTimersByTimeAsync(60_001)
    const observed = snapshotResult
    const sandbox = await handle(w, 'sbx-b')
    await expect(sandbox.exec('other-project')).resolves.toMatchObject({ exitCode: 0 })
    let sameSandboxSettled = false
    const sameSandbox = w.provider.get('sbx-a').then(() => {
      sameSandboxSettled = true
    })
    await vi.advanceTimersByTimeAsync(1)
    expect(sameSandboxSettled).toBe(false)
    w.finish('sbx-a')
    await commit
    await sameSandbox
    expect(observed).toBeInstanceOf(Error)
    expect(String(observed)).toContain('snapshot')
    expect(w.refused).toEqual([])
    expect(vi.getTimerCount()).toBe(0)
  })

  it('bounds a callback that waits for its own snapshot gate', async () => {
    vi.useFakeTimers()
    const release = deferred()
    let result: unknown = 'pending'
    const snapshot = withSnapshotGate('self-wait', () =>
      Promise.race([snapshotsSettled('self-wait'), release.promise]),
    ).then(
      (value) => {
        result = value
      },
      (error) => {
        result = error
      },
    )
    await vi.advanceTimersByTimeAsync(60_001)
    const observed = result
    release.resolve()
    await snapshot
    await snapshotsSettled('self-wait')
    expect(observed).toBeInstanceOf(Error)
    expect(String(observed)).toContain('snapshot')
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('already-started commands', () => {
  afterEach(() => vi.useRealTimers())

  async function delayedCommandWorld(probeGone = false) {
    const w = world()
    const connect = w.client.connect
    const finished = deferred()
    w.client.connect = async (id, opts) => {
      const sbx = await connect(id, opts)
      const run = sbx.commands.run.bind(sbx.commands)
      sbx.commands.run = (async (command: string, options: { background?: boolean }) => {
        const original = await run(command, options as never)
        if (options.background && command === 'already-started') {
          return {
            ...original,
            wait: async () => {
              await finished.promise
              return { stdout: 'completed once', stderr: '', exitCode: 0 }
            },
          }
        }
        if (probeGone && command.startsWith('kill -0')) {
          return {
            ...original,
            wait: async () => ({ stdout: 'MOL_GONE', stderr: '', exitCode: 0 }),
          }
        }
        return original
      }) as E2BSandboxLike['commands']['run']
      return sbx
    }
    return { w, sandbox: await handle(w, 'sbx-a'), finished }
  }

  it('lets an in-flight command finish during a snapshot without replaying it', async () => {
    const { w, sandbox, finished } = await delayedCommandWorld()
    const execution = sandbox.exec('already-started')
    await settle()
    const commit = w.provider.commitTemplate({ sandboxId: 'sbx-a', templateId: 'cache' })
    await w.snapshotStarted('sbx-a')
    finished.resolve()
    await expect(execution).resolves.toEqual({ stdout: 'completed once', stderr: '', exitCode: 0 })
    w.finish('sbx-a')
    await commit
    expect(w.served.filter((call) => call === 'sbx-a run already-started')).toHaveLength(1)
    expect(w.refused).toEqual([])
  })

  it('holds isProcessAlive requests made by an in-flight command', async () => {
    vi.useFakeTimers()
    const { w, sandbox, finished } = await delayedCommandWorld(true)
    const execution = sandbox.exec('already-started')
    await vi.advanceTimersByTimeAsync(1)
    const commit = w.provider.commitTemplate({ sandboxId: 'sbx-a', templateId: 'cache' })
    await w.snapshotStarted('sbx-a')
    await vi.advanceTimersByTimeAsync(1_501)
    expect(w.served.filter((call) => call.includes('kill -0'))).toEqual([])
    w.finish('sbx-a')
    await commit
    finished.resolve()
    await vi.advanceTimersByTimeAsync(1)
    await expect(execution).resolves.toMatchObject({ exitCode: 0 })
    expect(w.served.filter((call) => call.includes('kill -0'))).toHaveLength(1)
    expect(w.refused).toEqual([])
  })
})

describe('PTY startup follow-up requests', () => {
  it.each(['create', 'input failure'] as const)(
    'holds requests after a snapshot starts during %s',
    async (stage) => {
      const w = world()
      const connect = w.client.connect
      const startupError = new Error('PTY startup failed')
      let commit: Promise<unknown> | undefined
      w.client.connect = async (id, options) => {
        const sbx = await connect(id, options)
        const pty = sbx.pty!
        const create = pty.create.bind(pty)
        const beginSnapshot = async () => {
          commit = w.provider.commitTemplate({ sandboxId: id, templateId: 'cache' })
          await w.snapshotStarted(id)
        }
        if (stage === 'create') {
          pty.create = async (opts) => {
            const process = await create(opts)
            await beginSnapshot()
            return process
          }
        } else {
          pty.sendInput = async () => {
            await beginSnapshot()
            throw startupError
          }
        }
        return sbx
      }
      const sandbox = await handle(w, 'sbx-a')
      const spawn = sandbox.spawn!('sh', { pty: { cols: 80, rows: 24 } }).then(
        (value) => ({ value }),
        (error) => ({ error }),
      )
      await w.snapshotStarted('sbx-a')
      await settle()
      w.finish('sbx-a')
      await commit
      const result = await spawn
      if (stage === 'create') expect(result).toHaveProperty('value.write')
      else expect(result).toEqual({ error: startupError })
      expect(w.refused).toEqual([])
      expect(w.served).toContain(stage === 'create' ? 'sbx-a pty input' : 'sbx-a pty kill')
    },
  )
})

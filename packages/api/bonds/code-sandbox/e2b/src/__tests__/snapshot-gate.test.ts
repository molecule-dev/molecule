import { describe, expect, it } from 'vitest'

import { E2BSandboxProvider } from '../provider.js'
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
        run: (async (cmd: string) => {
          guard(id, `run ${cmd}`)
          const handle: E2BCommandHandleLike = {
            pid: 7,
            wait: async () => ({ stdout: 'ok', stderr: '', exitCode: 0 }),
            sendStdin: async () => {},
            kill: async () => true,
          }
          return handle
        }) as unknown as E2BSandboxLike['commands']['run'],
      },
      files: {
        read: (async (path: string) => {
          guard(id, `read ${path}`)
          return 'contents'
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
      async kill() {},
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
      return []
    },
    async getInfo(sandboxId) {
      // E2B reports the sandbox as paused while the snapshot is taken.
      return { sandboxId, state: paused.has(sandboxId) ? 'paused' : 'running' }
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

    w.finish('sbx-a')
    await commit
    await expect(described).resolves.toMatchObject({ id: 'sbx-a', status: 'running' })
    await expect(got).resolves.not.toBeNull()
    expect(w.refused).toEqual([])
  })
})

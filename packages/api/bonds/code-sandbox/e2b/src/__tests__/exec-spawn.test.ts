import { describe, expect, it, vi } from 'vitest'

import { E2BSandboxProvider } from '../provider.js'
import type {
  E2BCommandHandleLike,
  E2BPtyLike,
  E2BSandboxClientLike,
  E2BSandboxLike,
} from '../types.js'

// ---------------------------------------------------------------------------
// exec() and spawn() are the two ways anything reaches a process inside the
// microVM, and both used to be broken in ways that LOOKED like success:
//
//   • exec classified the command STRING (a trailing `&`) to decide whether to
//     background it, then fabricated `exitCode: 0` — so a launch shaped
//     `… & fi` hung for the full timeout while a user's `npm run build &`
//     reported instant success with no output;
//   • spawn did not exist at all, so every editor-intelligence feature (LSP)
//     and any cancellable terminal was dead in production.
//
// These tests pin the observed behaviour: exec always starts and then WAITS ON
// THE HANDLE, and spawn streams, writes, resizes and kills.
// ---------------------------------------------------------------------------

/** The SDK's non-zero-exit shape: an error carrying the real result. */
class FakeCommandExitError extends Error {
  constructor(readonly result: { stdout: string; stderr: string; exitCode: number }) {
    super(`exit status ${result.exitCode}`)
    this.name = 'CommandExitError'
  }
}

interface RunCall {
  cmd: string
  opts: Record<string, unknown>
}

/**
 * A fake sandbox whose `commands.run` records calls and answers from a queue of
 * behaviours keyed by command substring.
 */
function fakeSandbox(
  behaviours: Array<{
    match: string
    result?: { stdout: string; stderr: string; exitCode: number }
    throws?: unknown
    /** Never settles — models a wait that outlives the assertion. */
    pending?: boolean
  }> = [],
  opts: { pty?: E2BPtyLike | null } = {},
): { sbx: E2BSandboxLike; runs: RunCall[]; handles: E2BCommandHandleLike[] } {
  const runs: RunCall[] = []
  const handles: E2BCommandHandleLike[] = []
  const sbx = {
    sandboxId: 'sbx-test',
    commands: {
      run: (async (cmd: string, runOpts: Record<string, unknown> = {}) => {
        runs.push({ cmd, opts: runOpts })
        const behaviour = behaviours.find((b) => cmd.includes(b.match))
        const handle: E2BCommandHandleLike = {
          pid: 4242,
          wait: async () => {
            if (behaviour?.pending) return new Promise<never>(() => {})
            if (behaviour?.throws) throw behaviour.throws
            return behaviour?.result ?? { stdout: '', stderr: '', exitCode: 0 }
          },
          sendStdin: vi.fn(async () => {}),
          kill: vi.fn(async () => true),
        }
        handles.push(handle)
        return handle
      }) as unknown as E2BSandboxLike['commands']['run'],
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
    getHost: (port: number) => `${port}-sbx-test.e2b.app`,
    async setTimeout() {},
    async kill() {},
    async isRunning() {
      return true
    },
    ...(opts.pty === null ? {} : { pty: opts.pty ?? fakePty() }),
  } as unknown as E2BSandboxLike
  return { sbx, runs, handles }
}

/** A fake PTY module recording every interaction. */
function fakePty(): E2BPtyLike & {
  created: Array<Record<string, unknown>>
  inputs: Uint8Array[]
  resizes: Array<{ cols: number; rows: number }>
  killed: number[]
  emit: (data: string) => void
} {
  const created: Array<Record<string, unknown>> = []
  const inputs: Uint8Array[] = []
  const resizes: Array<{ cols: number; rows: number }> = []
  const killed: number[] = []
  let onData: ((data: Uint8Array) => void) | null = null
  return {
    created,
    inputs,
    resizes,
    killed,
    emit: (data: string) => onData?.(new TextEncoder().encode(data)),
    async create(createOpts) {
      created.push(createOpts as unknown as Record<string, unknown>)
      onData = createOpts.onData as (data: Uint8Array) => void
      return {
        pid: 77,
        wait: () => new Promise<never>(() => {}),
        sendStdin: async () => {},
        kill: async () => true,
      }
    },
    async sendInput(_pid, data) {
      inputs.push(data)
    },
    async resize(_pid, size) {
      resizes.push(size)
    },
    async kill(pid) {
      killed.push(pid)
      return true
    },
  }
}

/** Build a provider whose only sandbox is the given fake. */
function providerFor(sbx: E2BSandboxLike): E2BSandboxProvider {
  const client: E2BSandboxClientLike = {
    async create() {
      return sbx
    },
    async connect() {
      return sbx
    },
    async list() {
      return []
    },
  }
  return new E2BSandboxProvider({ apiKey: 'test' }, client)
}

/** Resolve a handle for the fake sandbox. */
async function handleFor(sbx: E2BSandboxLike) {
  const sandbox = await providerFor(sbx).get('sbx-test')
  if (!sandbox) throw new Error('expected a sandbox handle')
  return sandbox
}

describe('exec() observes the process instead of classifying the command', () => {
  it('starts every command in the background and waits on the handle', async () => {
    const { sbx, runs } = fakeSandbox([
      { match: 'echo hi', result: { stdout: 'hi\n', stderr: '', exitCode: 0 } },
    ])
    const sandbox = await handleFor(sbx)

    const result = await sandbox.exec('echo hi', { cwd: '/workspace', timeout: 5000 })

    expect(result).toEqual({ stdout: 'hi\n', stderr: '', exitCode: 0 })
    expect(runs).toHaveLength(1)
    expect(runs[0].opts).toMatchObject({
      background: true,
      cwd: '/workspace',
      timeoutMs: 5000,
    })
  })

  it('reports the real output and exit code of a command that ends with "&"', async () => {
    // The old bond short-circuited this shape to a fabricated empty success.
    const { sbx } = fakeSandbox([
      {
        match: 'npm run build',
        throws: new FakeCommandExitError({ stdout: 'partial\n', stderr: 'boom\n', exitCode: 2 }),
      },
    ])
    const sandbox = await handleFor(sbx)

    await expect(sandbox.exec('npm run build &')).resolves.toEqual({
      stdout: 'partial\n',
      stderr: 'boom\n',
      exitCode: 2,
    })
  })

  it('does not hang on a launch whose "&" is inside an if-guard', async () => {
    // `… & fi` never matched the old trailing-& regex, so it took the inline
    // path and blocked until the request deadline.
    const { sbx, runs } = fakeSandbox([
      { match: 'nohup', result: { stdout: '', stderr: '', exitCode: 0 } },
    ])
    const sandbox = await handleFor(sbx)

    const result = await sandbox.exec(
      "if ! curl -s localhost:5173; then nohup sh -c 'vite' > /tmp/app.log 2>&1 & fi",
      { timeout: 15_000 },
    )

    expect(result.exitCode).toBe(0)
    expect(runs[0].opts).toMatchObject({ background: true })
  })

  it('rethrows an infrastructure failure that carries no result', async () => {
    const timeout = Object.assign(new Error('deadline exceeded'), { name: 'TimeoutError' })
    const { sbx } = fakeSandbox([{ match: 'sleep', throws: timeout }])
    const sandbox = await handleFor(sbx)

    await expect(sandbox.exec('sleep 60', { timeout: 1000 })).rejects.toThrow('deadline exceeded')
  })
})

describe('spawn() — the capability LSP and a cancellable terminal need', () => {
  it('streams stdout/stderr, writes stdin, and reports close', async () => {
    const { sbx, runs, handles } = fakeSandbox([{ match: 'language-server', pending: true }])
    const sandbox = await handleFor(sbx)

    const handle = await sandbox.spawn!('typescript-language-server --stdio', {
      cwd: '/workspace/my-app',
    })

    const out: string[] = []
    const err: string[] = []
    handle.onStdout((d) => out.push(d))
    handle.onStderr((d) => err.push(d))

    const opts = runs[0].opts as { onStdout: (d: string) => void; onStderr: (d: string) => void }
    opts.onStdout('Content-Length: 2\r\n\r\n{}')
    opts.onStderr('warning')
    expect(out).toEqual(['Content-Length: 2\r\n\r\n{}'])
    expect(err).toEqual(['warning'])

    handle.write('{"jsonrpc":"2.0"}')
    expect(handles[0].sendStdin).toHaveBeenCalledWith('{"jsonrpc":"2.0"}')

    handle.kill()
    expect(handles[0].kill).toHaveBeenCalled()
  })

  it('keeps stdin open and outlives the SDK default command deadline', async () => {
    const { sbx, runs } = fakeSandbox([{ match: 'cat', pending: true }])
    const sandbox = await handleFor(sbx)

    await sandbox.spawn!('cat')

    expect(runs[0].opts).toMatchObject({ background: true, stdin: true })
    expect(runs[0].opts.timeoutMs as number).toBeGreaterThan(60_000)
  })

  it('fires onClose when the process exits, and for a listener added after it', async () => {
    const { sbx } = fakeSandbox([
      { match: 'true', result: { stdout: '', stderr: '', exitCode: 0 } },
    ])
    const sandbox = await handleFor(sbx)

    const handle = await sandbox.spawn!('true')
    const closed = await new Promise<boolean>((resolve) => {
      handle.onClose(() => resolve(true))
      setTimeout(() => resolve(false), 200)
    })
    expect(closed).toBe(true)

    // A late listener must not wait forever for an event that already happened.
    const late = await new Promise<boolean>((resolve) => {
      handle.onClose(() => resolve(true))
      setTimeout(() => resolve(false), 50)
    })
    expect(late).toBe(true)
  })

  it('allocates a real PTY when asked, and resize + input reach it', async () => {
    const pty = fakePty()
    const { sbx } = fakeSandbox([], { pty })
    const sandbox = await handleFor(sbx)

    const handle = await sandbox.spawn!('bash', {
      pty: { cols: 100, rows: 30 },
      cwd: '/workspace/my-app',
    })

    expect(pty.created[0]).toMatchObject({ cols: 100, rows: 30, cwd: '/workspace/my-app' })

    const chunks: string[] = []
    handle.onStdout((d) => chunks.push(d))
    pty.emit('user@e2b:~$ ')
    expect(chunks).toEqual(['user@e2b:~$ '])

    handle.write('')
    expect(Array.from(pty.inputs[0])).toEqual([3])

    handle.resize?.({ cols: 200, rows: 50 })
    expect(pty.resizes).toEqual([{ cols: 200, rows: 50 }])

    handle.kill()
    expect(pty.killed).toEqual([77])
  })

  it('refuses a PTY request the SDK build cannot honour instead of returning pipes', async () => {
    const { sbx } = fakeSandbox([], { pty: null })
    const sandbox = await handleFor(sbx)

    await expect(sandbox.spawn!('bash', { pty: { cols: 80, rows: 24 } })).rejects.toThrow(/pty/i)
  })

  it('exposes no resize on a non-PTY spawn, so a caller can feature-detect', async () => {
    const { sbx } = fakeSandbox([{ match: 'cat', pending: true }])
    const sandbox = await handleFor(sbx)

    const handle = await sandbox.spawn!('cat')
    expect(handle.resize).toBeUndefined()
  })
})

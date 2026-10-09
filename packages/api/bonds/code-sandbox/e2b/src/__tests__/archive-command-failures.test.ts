import { describe, expect, it } from 'vitest'

import { E2BSandboxProvider } from '../provider.js'
import type { E2BSandboxClientLike, E2BSandboxLike } from '../types.js'

// ---------------------------------------------------------------------------
// The REAL SDK (2.51.0, commands.run) never RETURNS a non-zero exit: inline
// run() is `proc.wait()`, which THROWS `CommandExitError` (carrying `.result`)
// the moment `exitCode !== 0`. The archive paths (importFiles / exportFiles)
// checked `r.exitCode !== 0` after a bare `await run()` — checks that were
// dead code in production: a failed spool/extract/create surfaced as a bare
// `CommandExitError: exit status N` with no stage name and no stderr, while
// the result-returning fakes in the other test files made them look live.
// These tests model the real contract so the stage-carrying, stderr-quoting
// errors are pinned against the shape production actually delivers.
// ---------------------------------------------------------------------------

/** The SDK's non-zero-exit shape: an error carrying the real result. */
class FakeCommandExitError extends Error {
  constructor(readonly result: { stdout: string; stderr: string; exitCode: number }) {
    super(`exit status ${result.exitCode}`)
    this.name = 'CommandExitError'
  }
}

/**
 * A fake sandbox that answers the way the real SDK does: an inline run THROWS
 * `CommandExitError` for a failing command and returns the result otherwise;
 * a background start returns a handle.
 */
function realContractSandbox(
  failMatch: (cmd: string) => boolean,
  failure: { stdout: string; stderr: string; exitCode: number },
): { sbx: E2BSandboxLike; commands: string[] } {
  const commands: string[] = []
  const sbx = {
    sandboxId: 'sbx-archive',
    commands: {
      async run(cmd: string, opts?: { background?: boolean }) {
        commands.push(cmd)
        if (opts?.background) {
          return {
            pid: 1,
            wait: async () => ({ stdout: '', stderr: '', exitCode: 0 }),
            sendStdin: async () => {},
            kill: async () => true,
          }
        }
        if (failMatch(cmd)) throw new FakeCommandExitError(failure)
        return { stdout: '', stderr: '', exitCode: 0 }
      },
    },
    files: {
      read: (async (_path: string, opts?: { format: 'bytes' }) =>
        opts?.format === 'bytes'
          ? new Uint8Array([1, 2, 3])
          : '') as E2BSandboxLike['files']['read'],
      async write() {
        return {}
      },
      async list() {
        return []
      },
      async remove() {},
    },
    getHost: (port: number) => `${port}-sbx-archive.e2b.app`,
    async setTimeout() {},
    async kill() {},
    async isRunning() {
      return true
    },
  } as unknown as E2BSandboxLike
  return { sbx, commands }
}

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

async function handleFor(sbx: E2BSandboxLike) {
  const sandbox = await providerFor(sbx).get('sbx-archive')
  if (!sandbox) throw new Error('expected a sandbox handle')
  return sandbox
}

const oneChunk = (): AsyncIterable<Uint8Array> =>
  (async function* () {
    yield new Uint8Array([9, 9])
  })()

describe('importFiles / exportFiles failures under the real SDK contract', () => {
  it('names the failed extract stage and quotes its stderr when the SDK throws', async () => {
    const { sbx, commands } = realContractSandbox((cmd) => cmd.includes('tar xf '), {
      stdout: '',
      stderr: 'tar: This does not look like a tar archive',
      exitCode: 2,
    })
    const sandbox = await handleFor(sbx)

    await expect(sandbox.importFiles!('/workspace', oneChunk())).rejects.toThrow(
      /importFiles: tar extract failed \(2\): tar: This does not look like a tar archive/,
    )
    // The spool file is still removed after the failed extract.
    expect(commands.at(-1)).toMatch(/^rm -f \/tmp\/mol-import-/)
  })

  it('names the failed spool stage and quotes its stderr when the SDK throws', async () => {
    const { sbx, commands } = realContractSandbox((cmd) => cmd.includes('.piece >'), {
      stdout: '',
      stderr: 'cat: /tmp/mol-import-x.tar.piece: No such file or directory',
      exitCode: 1,
    })
    const sandbox = await handleFor(sbx)

    await expect(sandbox.importFiles!('/workspace', oneChunk())).rejects.toThrow(
      /importFiles: spooling the archive failed \(1\): cat: \/tmp\/mol-import-x\.tar\.piece/,
    )
    expect(commands.at(-1)).toMatch(/^rm -f \/tmp\/mol-import-/)
  })

  it('names the failed tar create and quotes its stderr when the SDK throws', async () => {
    const { sbx, commands } = realContractSandbox((cmd) => cmd.startsWith('tar cf '), {
      stdout: '',
      stderr: 'tar: my-app: Cannot stat: No such file or directory',
      exitCode: 2,
    })
    const sandbox = await handleFor(sbx)

    await expect(sandbox.exportFiles!('/workspace/my-app')).rejects.toThrow(
      /exportFiles: tar create failed \(2\): tar: my-app: Cannot stat/,
    )
    // The half-written archive is still removed.
    expect(commands.at(-1)).toMatch(/^rm -f \/tmp\/mol-export-/)
  })

  it('names the failed empty-archive create when the archive yields nothing and the disk is full', async () => {
    // An archive that yields zero chunks still creates its (empty) tar before
    // extracting; when THAT command fails (a full /tmp is the usual cause) the
    // error must name the stage and quote the stderr like the spool/extract/
    // create failures do — not the SDK's bare `exit status N`.
    const empty = (): AsyncIterable<Uint8Array> =>
      (async function* () {
        /* yields nothing */
      })()
    const { sbx, commands } = realContractSandbox((cmd) => cmd.startsWith(': > '), {
      stdout: '',
      stderr: 'bash: /tmp/mol-import-x.tar: No space left on device',
      exitCode: 1,
    })
    const sandbox = await handleFor(sbx)

    await expect(sandbox.importFiles!('/workspace', empty())).rejects.toThrow(
      /importFiles: creating the empty archive failed \(1\): bash: \/tmp\/mol-import-x\.tar: No space left on device/,
    )
    // The spool files are still removed after the failure.
    expect(commands.at(-1)).toMatch(/^rm -f \/tmp\/mol-import-/)
  })

  it('propagates an infrastructure failure that carries no result untouched', async () => {
    // A timeout / connection loss has no `.result` — mapping it into an exit
    // code would fabricate an outcome. It must keep propagating as-is.
    const { sbx } = realContractSandbox((cmd) => cmd.includes('tar xf '), {
      stdout: '',
      stderr: '',
      exitCode: 0,
    })
    const deadline = Object.assign(new Error('deadline exceeded'), { name: 'TimeoutError' })
    sbx.commands.run = (async (cmd: string, opts?: { background?: boolean }) => {
      if (!opts?.background && cmd.includes('tar xf ')) throw deadline
      return { stdout: '', stderr: '', exitCode: 0 }
    }) as typeof sbx.commands.run
    const sandbox = await handleFor(sbx)

    await expect(sandbox.importFiles!('/workspace', oneChunk())).rejects.toThrow(
      'deadline exceeded',
    )
  })

  it('still imports and exports cleanly when every inline run succeeds', async () => {
    const { sbx, commands } = realContractSandbox(() => false, {
      stdout: '',
      stderr: '',
      exitCode: 0,
    })
    const sandbox = await handleFor(sbx)

    await expect(sandbox.importFiles!('/workspace', oneChunk())).resolves.toBeUndefined()
    const exported = await sandbox.exportFiles!('/workspace/app')
    for await (const chunk of exported) expect(chunk).toEqual(new Uint8Array([1, 2, 3]))
    expect(commands.some((cmd) => cmd.startsWith('tar cf '))).toBe(true)
    expect(commands.some((cmd) => cmd.includes('tar xf '))).toBe(true)
  })
})

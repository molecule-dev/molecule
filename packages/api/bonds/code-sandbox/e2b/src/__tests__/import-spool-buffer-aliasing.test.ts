import { describe, expect, it } from 'vitest'

import { E2BSandboxProvider } from '../provider.js'
import type { E2BSandboxClientLike, E2BSandboxLike } from '../types.js'

/**
 * A `files.read` fake: the SDK's two overloads — text, and bytes when asked for
 * bytes — over one implementation. These tests never read a file.
 *
 * @param _path - The path the provider asked for.
 * @returns Empty text, or empty bytes when `format: 'bytes'` was requested.
 */
async function readFile(_path: string): Promise<string>
async function readFile(
  _path: string,
  opts: { format: 'bytes'; requestTimeoutMs?: number },
): Promise<Uint8Array>
async function readFile(
  _path: string,
  opts?: { format: 'bytes'; requestTimeoutMs?: number },
): Promise<string | Uint8Array> {
  return opts?.format === 'bytes' ? new Uint8Array() : ''
}

/**
 * A fake SDK sandbox that records the exact BYTES written to the spool piece.
 *
 * `importFiles` hands each piece to the SDK as a `Blob`, so the Blob's bytes are
 * snapshotted here at the moment the provider decides to write them — which is
 * what makes a producer-side buffer reuse visible at all.
 * @param sandboxId - The fake sandbox id.
 * @returns The fake sandbox plus the recorded pieces.
 */
function fakeSandbox(sandboxId: string) {
  const pieces: Uint8Array[] = []
  const sbx: E2BSandboxLike = {
    sandboxId,
    commands: {
      async run() {
        const result = { stdout: '', stderr: '', exitCode: 0 }
        return {
          ...result,
          pid: 1,
          wait: async () => result,
          sendStdin: async () => {},
          kill: async () => true,
        }
      },
    },
    files: {
      read: readFile,
      async write(_path, data) {
        if (data instanceof Blob) pieces.push(new Uint8Array(await data.arrayBuffer()))
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
    async isRunning() {
      return true
    },
  }
  return { sbx, pieces }
}

/**
 * Builds a provider wired to the fake sandbox.
 * @param sbx - The fake SDK sandbox.
 * @returns The provider.
 */
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

describe('E2B importFiles spools the bytes each chunk carried when it was YIELDED', () => {
  it('copies a piece out of a producer buffer that is recycled for every yield', async () => {
    // `subarray` is a view. The piece is held across the next `for await` pull
    // (and the flush's own writes), so a producer that reuses ONE buffer for
    // every yield — `for (…) yield piece`, the shape the spool suite itself
    // uses — overwrote every earlier piece before it was spooled: the archive
    // arrived silently corrupted, with one chunk's bytes repeated where the
    // preceding chunks belonged.
    const { sbx, pieces } = fakeSandbox('sbx-alias')
    const sandbox = await providerFor(sbx).get('sbx-alias')
    const recycled = new Uint8Array(1024)

    await sandbox!.importFiles!(
      '/workspace',
      (async function* () {
        for (let value = 1; value <= 3; value++) {
          recycled.fill(value)
          yield recycled
        }
      })(),
    )

    // 3 KB stays under one 8 MB piece, so the single write is the whole spool.
    expect(pieces).toHaveLength(1)
    const spooled = pieces[0]!
    expect(spooled.length).toBe(3 * 1024)
    for (let value = 1; value <= 3; value++) {
      const from = (value - 1) * 1024
      expect(Array.from(spooled.subarray(from, from + 1024))).toEqual(new Array(1024).fill(value))
    }
  })
})

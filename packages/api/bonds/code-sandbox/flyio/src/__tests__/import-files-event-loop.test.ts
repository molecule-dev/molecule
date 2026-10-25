/**
 * `importFiles` compresses a whole deploy archive. A server process that hosts
 * this provider has to keep answering requests while it does: the compression
 * must not hold the caller's event loop.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest'

import { createStoreDouble, mockLogger } from './helpers.js'

vi.mock('@molecule/api-bond', () => ({ getLogger: () => mockLogger }))
vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}))

const { FlyApiClient } = await import('../api.js')
const { createProvider } = await import('../provider.js')

const APP = 'mol-sandbox-a3f1c0de-0000-4000-8000-000000000001'

describe('importFiles and the event loop', () => {
  it('lets other callbacks run while the archive is compressed', async () => {
    const fetchImpl = vi.fn(async (input: string | URL) => {
      if (String(input).endsWith('/exec')) {
        return {
          status: 200,
          headers: { get: () => null },
          text: async () => JSON.stringify({ exit_code: 0 }),
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
    const sandbox = await createProvider({ orgSlug: 'acme' }, client, createStoreDouble()).get(
      `${APP}:m1`,
    )
    if (!sandbox?.importFiles) throw new Error('expected a sandbox that imports files')

    // Another piece of work sharing the loop (an HTTP request being served, in
    // a real process): it re-arms itself on every turn of the loop.
    let turns = 0
    let running = true
    const spin = (): void => {
      turns += 1
      if (running) setImmediate(spin)
    }
    let turnsBeforeUpload = -1
    const putFetch = vi.fn(async () => {
      turnsBeforeUpload = turns
      return { ok: true, status: 200, body: { cancel: async () => {} } } as unknown as Response
    })
    vi.stubGlobal('fetch', putFetch)
    try {
      // 8 MB of compressible bytes. The upload can only start once compression
      // has finished, so the turns counted by then are turns the loop was free
      // DURING the compression.
      const bytes = Buffer.alloc(8 * 1024 * 1024, 'molecule deploy artifact ')
      async function* archive(): AsyncGenerator<Uint8Array> {
        yield bytes
      }
      const done = sandbox.importFiles('/workspace/my-app', archive())
      setImmediate(spin)
      await done
    } finally {
      running = false
      vi.unstubAllGlobals()
    }

    expect(putFetch).toHaveBeenCalledTimes(1)
    expect(turnsBeforeUpload).toBeGreaterThan(0)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { E2BSandboxProvider } from '../provider.js'
import type { E2BSandboxLike } from '../types.js'

// ---------------------------------------------------------------------------
// `defaultClient()` adapts the SDK's `Sandbox.list()` — which has shipped more
// than one shape across versions (a promise of an array, a nextItems() pager,
// an async iterable) — into one flat array. Every consumer of that array reads
// EMPTINESS as ABSENCE (`list()`: no live sandboxes; `listVolumes()`: every
// volume unattached; `listTemplates()`: no template in use), and this
// provider's own lookup contracts refuse to answer "could not look" as
// "looked, nothing exists" (`getTemplate`/`listTemplates`/`volumeExists` all
// throw instead). So among the SUPPORTED shapes — including the
// promise-of-array one — a REJECTED listing must propagate as a throw, never
// resolve as `[]`.
//
// These tests drive the real adapter (no clientOverride) against a mocked
// `e2b` module, so the promise shapes are exercisable.
// ---------------------------------------------------------------------------

const { listSandbox, listSnapshotsStatic, connectSandbox } = vi.hoisted(() => ({
  listSandbox: vi.fn(),
  listSnapshotsStatic: vi.fn(),
  connectSandbox: vi.fn(),
}))

vi.mock('e2b', () => ({
  Sandbox: {
    list: listSandbox,
    connect: connectSandbox,
    listSnapshots: listSnapshotsStatic,
  },
  SandboxNotFoundError: class SandboxNotFoundError extends Error {
    override name = 'SandboxNotFoundError'
  },
  Volume: { create: vi.fn(), list: vi.fn(), destroy: vi.fn() },
}))

/** A minimal live sandbox for `connect()` to resolve. */
function fakeSandbox(id: string): E2BSandboxLike {
  return {
    sandboxId: id,
    commands: { run: vi.fn() },
    files: {
      read: vi.fn(),
      write: vi.fn(),
      list: vi.fn(),
      remove: vi.fn(),
    },
    getHost: (port: number) => `${port}-${id}.e2b.app`,
    setTimeout: vi.fn(),
    kill: vi.fn(),
    isRunning: vi.fn(),
  } as unknown as E2BSandboxLike
}

const provider = (): E2BSandboxProvider => new E2BSandboxProvider({ apiKey: 'test' })

describe('the SDK client adapter normalizes Sandbox.list() shapes', () => {
  beforeEach(() => {
    listSandbox.mockReset()
    listSnapshotsStatic.mockReset()
    connectSandbox.mockReset()
    // The SDK returns the pager SYNCHRONOUSLY (not a promise of one), so the
    // mock must too — mockResolvedValue here would hand the adapter a Promise
    // and test a shape this SDK method never has.
    listSnapshotsStatic.mockImplementation(() => ({
      hasNext: false,
      nextItems: async () => [],
    }))
    connectSandbox.mockImplementation(async (id: string) => fakeSandbox(id))
  })

  it('propagates a failed listing instead of answering an empty one', async () => {
    // The promise-of-array SDK shape: `Sandbox.list()` returns a promise that
    // REJECTS (an API outage). The rejection must reach the caller — every
    // consumer reads emptiness as absence (`list()`: no live sandboxes;
    // `listTemplates()`: no template in use, which a reclamation sweep would
    // act on) — and this provider's contracts all throw rather than answer
    // "looked, and nothing exists". The adapter's `.catch(() => result)` is
    // inert here (returning the same rejected promise re-rejects the await),
    // but any future shape-dispatch refactor that wraps the whole adapter in
    // a swallow would resolve `[]` — this pins that it never does.
    listSandbox.mockRejectedValue(new Error('connect ECONNRESET'))

    await expect(provider().list('user')).rejects.toThrow('connect ECONNRESET')
    await expect(provider().listTemplates()).rejects.toThrow('connect ECONNRESET')
  })

  it('still flattens a promise of an array', async () => {
    listSandbox.mockResolvedValue([{ sandboxId: 'sbx-1', state: 'running' }])
    const handles = await provider().list('user')
    expect(handles.map((h) => h.id)).toEqual(['sbx-1'])
  })

  it('still flattens a nextItems() pager', async () => {
    listSandbox.mockResolvedValue({
      hasNext: false,
      nextItems: async () => [{ sandboxId: 'sbx-2', state: 'running' }],
    })
    const handles = await provider().list('user')
    expect(handles.map((h) => h.id)).toEqual(['sbx-2'])
  })

  it('still flattens an async iterable', async () => {
    const item = { sandboxId: 'sbx-3', state: 'running' }
    listSandbox.mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        yield item
      },
    })
    const handles = await provider().list('user')
    expect(handles.map((h) => h.id)).toEqual(['sbx-3'])
  })
})

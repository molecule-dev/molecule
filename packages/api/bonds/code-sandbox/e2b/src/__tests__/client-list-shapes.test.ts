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

  it('still flattens the { sandboxes: [...] } envelope', async () => {
    listSandbox.mockResolvedValue({
      sandboxes: [{ sandboxId: 'sbx-4', state: 'running' }],
    })
    const handles = await provider().list('user')
    expect(handles.map((h) => h.id)).toEqual(['sbx-4'])
  })

  it('refuses an unrecognized listing shape instead of answering an empty one', async () => {
    // A minor SDK change (a new envelope — here `{ items: [...] }`) must not
    // silently read as "no sandboxes exist". Every consumer of the flattened
    // listing reads EMPTINESS as ABSENCE: `list()` reports no live sandboxes,
    // `listVolumes()` marks every volume unattached, `getTemplate`/
    // `listTemplates()` mark every snapshot not in use — and an eviction or
    // reclamation sweep DELETES on those answers. An unreadable listing is a
    // failure to look, and it must throw like every other failed lookup.
    listSandbox.mockResolvedValue({ items: [{ sandboxId: 'sbx-9', state: 'running' }] })

    await expect(provider().list('user')).rejects.toThrow(/shape this adapter cannot read.*items/s)
  })

  it('refuses a null listing instead of answering an empty one', async () => {
    listSandbox.mockResolvedValue(null)

    await expect(provider().list('user')).rejects.toThrow(/shape this adapter cannot read/)
  })

  it('puts every running sandbox connect in flight together, not one serial round trip each', async () => {
    // list() builds one handle per running sandbox and each handle is a full
    // connect round trip. Awaited one after the next, a fleet sweep over N
    // sandboxes serializes N round trips per poll. The gate below only opens
    // a connect once ALL of them have been CALLED — so list() can only finish
    // when the connects are genuinely concurrent; the old serial loop stalls
    // with one gate open and this test times out waiting for the rest.
    const ids = ['sbx-a', 'sbx-b', 'sbx-c']
    listSandbox.mockResolvedValue(ids.map((sandboxId) => ({ sandboxId, state: 'running' })))
    const gates = new Map<string, () => void>()
    connectSandbox.mockImplementation(
      (id: string) =>
        new Promise((resolve) => {
          gates.set(id, () => resolve(fakeSandbox(id)))
        }),
    )

    const listing = provider().list('user')
    // Give a serial loop every chance to ( wrongly) advance: with the bug it
    // has issued exactly ONE connect by now and is parked awaiting it.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect([...gates.keys()].sort()).toEqual(['sbx-a', 'sbx-b', 'sbx-c'])

    for (const open of gates.values()) open()
    const handles = await listing
    expect(handles.map((h) => h.id)).toEqual(ids)
  })

  it('caps how many sandbox connects are in flight at once', async () => {
    // Concurrency is bounded, not unbounded: every handle is a live websocket,
    // and a sweep that puts ALL N in flight spends N sockets and file
    // descriptors per poll on an account with N running sandboxes. 40
    // sandboxes with the cap at 16: overlap must happen (the previous test
    // pins that it is not serial) but never exceed the window — the old
    // `Promise.all` over every listing row peaks at 40 and fails this.
    const ids = Array.from({ length: 40 }, (_, i) => `sbx-${i}`)
    listSandbox.mockResolvedValue(ids.map((sandboxId) => ({ sandboxId, state: 'running' })))
    let inFlight = 0
    let peak = 0
    connectSandbox.mockImplementation(async (id: string) => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 2))
      inFlight--
      return fakeSandbox(id)
    })

    const handles = await provider().list('user')
    expect(handles.map((h) => h.id)).toEqual(ids)
    expect(peak).toBeGreaterThan(1) // concurrent, not serialized
    expect(peak).toBeLessThanOrEqual(16) // …but bounded
  })

  it('stops issuing connects once one listing row fails, instead of walking the rest', async () => {
    // One connect rejects (a transient API blip). The rejection reaches the
    // caller immediately — but each connect is a SIDE EFFECT (on the real SDK
    // it resumes/extends a live sandbox's deadline), so the workers that never
    // failed must not keep pulling from the shared cursor afterwards and
    // connect every remaining row on behalf of a call that already threw.
    // Without the stop flag the other 15 workers churn through all 40 rows
    // after the failure; with it only the bounded window's in-flight connects
    // ever happen. (Each connect takes one timer tick and sbx-0's fires first,
    // so the flag is set before any survivor finishes its current item.)
    const ids = Array.from({ length: 40 }, (_, i) => `sbx-${i}`)
    listSandbox.mockResolvedValue(ids.map((sandboxId) => ({ sandboxId, state: 'running' })))
    connectSandbox.mockImplementation(async (id: string) => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      if (id === 'sbx-0') throw new Error('connect ECONNRESET')
      return fakeSandbox(id)
    })

    await expect(provider().list('user')).rejects.toThrow('connect ECONNRESET')
    // Let every surviving worker quiesce before counting: the assertion must
    // observe what the workers do AFTER the failure, not whatever had been
    // issued by the microtask the rejection surfaced in.
    await new Promise((resolve) => setTimeout(resolve, 25))
    expect(connectSandbox.mock.calls.length).toBeLessThanOrEqual(16)
  })
})

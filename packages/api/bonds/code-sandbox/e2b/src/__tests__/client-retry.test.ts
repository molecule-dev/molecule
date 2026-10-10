import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// `E2BSandboxProvider.client()` memoizes the SDK client it resolves through
// `defaultClient()` (which awaits `import('e2b')`). Memoizing the REJECTION of
// a failed load made one transient failure permanent: every later call
// (`create`/`get`/`list`/`destroy`, …) awaited the same rejected promise for
// the life of the process, with no path back. A failed load must be evicted so
// the next call retries — the eviction the other long-lived caches in this tree
// already apply.
//
// The failure is injected at the SDK boundary: the mocked module's `Sandbox`
// accessor throws until `failuresToServe` is spent, which is exactly what
// `defaultClient()`'s `const { Sandbox } = await import('e2b')` sees.
// ---------------------------------------------------------------------------

const { listSandbox, state } = vi.hoisted(() => ({
  listSandbox: vi.fn(),
  state: { failuresToServe: 1 },
}))

vi.mock('e2b', () => ({
  get Sandbox(): unknown {
    if (state.failuresToServe > 0) {
      state.failuresToServe -= 1
      throw new Error('transient: the e2b module failed to initialise')
    }
    return { list: listSandbox, connect: vi.fn() }
  },
  SandboxNotFoundError: class SandboxNotFoundError extends Error {
    override name = 'SandboxNotFoundError'
  },
  Volume: { create: vi.fn(), list: vi.fn(), destroy: vi.fn() },
}))

const { E2BSandboxProvider } = await import('../provider.js')

describe('the SDK client load is retried after a failure', () => {
  beforeEach(() => {
    state.failuresToServe = 1
    listSandbox.mockReset()
    listSandbox.mockResolvedValue([])
  })

  it('does not cache a rejected client promise — the next call retries', async () => {
    const provider = new E2BSandboxProvider({ apiKey: 'test' })

    // First call: the SDK load fails, so the call rejects.
    await expect(provider.list('user')).rejects.toThrow(/transient/)

    // Without the eviction the rejected promise is reused here and this second
    // call rejects identically, forever. With it, the load is retried and the
    // listing runs.
    await expect(provider.list('user')).resolves.toEqual([])
    expect(listSandbox).toHaveBeenCalledTimes(1)
  })

  it('still reports every failure while the load keeps failing', async () => {
    state.failuresToServe = 2
    const provider = new E2BSandboxProvider({ apiKey: 'test' })

    await expect(provider.list('user')).rejects.toThrow(/transient/)
    await expect(provider.list('user')).rejects.toThrow(/transient/)
    await expect(provider.list('user')).resolves.toEqual([])
  })
})

// @vitest-environment jsdom
/**
 * Unit tests for `useKeyboardShortcut` and `expandKeys`, ported from
 * `@molecule/app-keyboard-shortcuts-react`'s own suite: the same test names,
 * the same assertions, mounted as real Svelte components over a fake provider.
 *
 * @module
 */
import { flushSync, mount, unmount } from 'svelte'
import { writable } from 'svelte/store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetProvider } = vi.hoisted(() => ({ mockGetProvider: vi.fn() }))
vi.mock('@molecule/app-keyboard-shortcuts', () => ({ getProvider: mockGetProvider }))

import { expandKeys, useKeyboardShortcut } from '../useKeyboardShortcut.js'
import HookProbe from './HookProbe.svelte'

/** The mounted probes; torn down after every test, like React's roots. */
const instances: Array<Record<string, unknown>> = []
afterEach(async () => {
  for (const instance of instances.splice(0)) await unmount(instance)
})

/**
 * Mounts a component whose init calls one hook, the way an app does.
 *
 * @param call - The init body.
 */
function mountProbe(call: () => void): void {
  instances.push(
    mount(HookProbe, {
      target: document.createElement('div'),
      props: { call },
    }),
  )
  flushSync()
}

/** A fake provider's recording shape. */
interface Fake {
  registerMany: ReturnType<typeof vi.fn>
  unregister: ReturnType<typeof vi.fn>
  registered: Array<{ keys: string; handler: (e: KeyboardEvent) => void }>
}

/**
 * Builds a fake keyboard-shortcuts provider.
 *
 * @returns The fake, recording `registerMany` calls.
 */
function fakeProvider(): Fake {
  const f: Fake = {
    registered: [],
    unregister: vi.fn(),
    registerMany: vi.fn((shortcuts: Fake['registered']) => {
      f.registered.push(...shortcuts)
      return f.unregister
    }),
  }
  return f
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('expandKeys', () => {
  it('expands mod+ to ctrl and command, lowercases, and drops blanks', () => {
    expect(expandKeys('Mod+K')).toEqual(['ctrl+k', 'command+k'])
    expect(expandKeys(['/', ' ', 'shift+?'])).toEqual(['/', 'shift+?'])
  })
})

describe('useKeyboardShortcut', () => {
  it('registers on mount, calls the latest handler, and unregisters on unmount', async () => {
    const f = fakeProvider()
    mockGetProvider.mockReturnValue(f)
    const first = vi.fn()
    const second = vi.fn()
    // React re-renders the hook with a new closure; the Svelte counterpart
    // reads the changing action through the store the registration reads at
    // call time.
    const handler = writable(first)
    mountProbe(() => {
      useKeyboardShortcut('mod+k', handler, { description: 'Open' })
    })
    expect(f.registerMany).toHaveBeenCalledTimes(1)
    expect(f.registered.map((s) => s.keys)).toEqual(['ctrl+k', 'command+k'])
    handler.set(second)
    expect(f.registerMany).toHaveBeenCalledTimes(1)
    const ev = new KeyboardEvent('keydown', { key: 'k' })
    f.registered[0]!.handler(ev)
    expect(second).toHaveBeenCalledWith(ev)
    expect(first).not.toHaveBeenCalled()
    await unmount(instances.splice(0)[0]!)
    expect(f.unregister).toHaveBeenCalledTimes(1)
  })

  it('does nothing when disabled or when no provider is bonded', () => {
    const f = fakeProvider()
    mockGetProvider.mockReturnValue(f)
    mountProbe(() => {
      useKeyboardShortcut('/', () => {}, { enabled: false })
    })
    expect(f.registerMany).not.toHaveBeenCalled()
    mockGetProvider.mockReturnValue(null)
    expect(() =>
      mountProbe(() => {
        useKeyboardShortcut('/', () => {})
      }),
    ).not.toThrow()
    expect(f.registerMany).not.toHaveBeenCalled()
  })
})

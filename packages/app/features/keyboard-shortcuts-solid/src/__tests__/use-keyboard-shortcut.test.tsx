// @vitest-environment jsdom
/**
 * Unit tests for `useKeyboardShortcut` and `expandKeys`, ported from
 * `@molecule/app-keyboard-shortcuts-react`'s own suite: the same test names,
 * the same assertions, mounted as real Solid roots over a fake provider.
 *
 * @module
 */
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetProvider } = vi.hoisted(() => ({ mockGetProvider: vi.fn() }))
vi.mock('@molecule/app-keyboard-shortcuts', () => ({ getProvider: mockGetProvider }))

import type { JSX } from 'solid-js'

const { expandKeys, useKeyboardShortcut } = await import('../use-keyboard-shortcut.js')

/** The roots this file mounted; disposed after every test, like React's roots. */
const disposers: Array<() => void> = []
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Mounts a component whose body calls one hook, the way an app does.
 *
 * @param setup - The component body.
 */
function mountProbe(setup: () => void): void {
  function Probe(): JSX.Element {
    setup()
    return <></>
  }
  const container = document.createElement('div')
  disposers.push(render(() => <Probe />, container))
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
  it('registers on mount, calls the latest handler, and unregisters on unmount', () => {
    const f = fakeProvider()
    mockGetProvider.mockReturnValue(f)
    const first = vi.fn()
    const second = vi.fn()
    // React re-renders the hook with a new closure; the Solid counterpart
    // reads the changing action through the app's own accessor.
    const [handler, setHandler] = createSignal<(event: KeyboardEvent) => void>(first)
    mountProbe(() => {
      useKeyboardShortcut('mod+k', (event) => handler()(event), { description: 'Open' })
    })
    expect(f.registerMany).toHaveBeenCalledTimes(1)
    expect(f.registered.map((s) => s.keys)).toEqual(['ctrl+k', 'command+k'])
    setHandler(() => second)
    expect(f.registerMany).toHaveBeenCalledTimes(1)
    const ev = new KeyboardEvent('keydown', { key: 'k' })
    f.registered[0]!.handler(ev)
    expect(second).toHaveBeenCalledWith(ev)
    expect(first).not.toHaveBeenCalled()
    disposers[0]!()
    disposers.length = 0
    expect(f.unregister).toHaveBeenCalledTimes(1)
  })

  it('does nothing when disabled or when no provider is bonded', () => {
    const f = fakeProvider()
    mockGetProvider.mockReturnValue(f)
    mountProbe(() => {
      useKeyboardShortcut('/', () => {}, { enabled: false })
    })
    expect(f.registerMany).not.toHaveBeenCalled()
    disposers[0]!()
    disposers.length = 0
    mockGetProvider.mockReturnValue(null)
    expect(() =>
      mountProbe(() => {
        useKeyboardShortcut('/', () => {})
      }),
    ).not.toThrow()
    expect(f.registerMany).not.toHaveBeenCalled()
  })
})

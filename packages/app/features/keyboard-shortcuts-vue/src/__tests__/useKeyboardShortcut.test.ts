// @vitest-environment jsdom
/**
 * Unit tests for `useKeyboardShortcut` and `expandKeys`, ported from
 * `@molecule/app-keyboard-shortcuts-react`'s own suite: the same test names,
 * the same assertions, mounted as real Vue apps over a fake provider.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetProvider } = vi.hoisted(() => ({ mockGetProvider: vi.fn() }))
vi.mock('@molecule/app-keyboard-shortcuts', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getProvider: mockGetProvider,
}))

import { type App, createApp, defineComponent, h, nextTick, ref } from 'vue'

const { expandKeys, useKeyboardShortcut } = await import('../useKeyboardShortcut.js')

type ShortcutHandler = (event: KeyboardEvent) => void

/** The apps this file mounted; unmounted after every test, like React's roots. */
const apps: App[] = []
afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
})

/**
 * Mounts a component whose setup calls one hook, the way an app does.
 *
 * @param setup - The setup body.
 * @returns The mounted app.
 */
function mountSetup(setup: () => void): App {
  const app = createApp(defineComponent({ setup, render: () => h('div') }))
  apps.push(app)
  app.mount(document.createElement('div'))
  return app
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
    const handler = ref<ShortcutHandler>(first)
    mountSetup(() => {
      useKeyboardShortcut('mod+k', handler, { description: 'Open' })
    })
    expect(f.registerMany).toHaveBeenCalledTimes(1)
    expect(f.registered.map((s) => s.keys)).toEqual(['ctrl+k', 'command+k'])
    // React re-renders the hook with a new closure; the Vue counterpart swaps
    // the ref the same mounted instance reads at call time.
    handler.value = second
    expect(f.registerMany).toHaveBeenCalledTimes(1)
    const ev = new KeyboardEvent('keydown', { key: 'k' })
    f.registered[0]!.handler(ev)
    expect(second).toHaveBeenCalledWith(ev)
    expect(first).not.toHaveBeenCalled()
    apps[0]!.unmount()
    expect(f.unregister).toHaveBeenCalledTimes(1)
  })

  it('does nothing when disabled or when no provider is bonded', async () => {
    const f = fakeProvider()
    mockGetProvider.mockReturnValue(f)
    mountSetup(() => {
      useKeyboardShortcut('/', () => {}, { enabled: false })
    })
    expect(f.registerMany).not.toHaveBeenCalled()
    apps[0]!.unmount()
    mockGetProvider.mockReturnValue(null)
    expect(() =>
      mountSetup(() => {
        useKeyboardShortcut('/', () => {})
      }),
    ).not.toThrow()
    await nextTick()
    expect(f.registerMany).not.toHaveBeenCalled()
  })
})

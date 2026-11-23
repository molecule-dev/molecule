// @vitest-environment jsdom
/**
 * Unit tests for `useKeyboardShortcut` and `expandKeys`, ported from
 * `@molecule/app-keyboard-shortcuts-react`'s own suite: the same test names,
 * the same assertions, mounted in a real zoneless Angular application over a
 * fake provider.
 *
 * @module
 */
import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetProvider } = vi.hoisted(() => ({ mockGetProvider: vi.fn() }))
vi.mock('@molecule/app-keyboard-shortcuts', () => ({ getProvider: mockGetProvider }))

const { expandKeys, useKeyboardShortcut } = await import('../use-keyboard-shortcut.js')

/** Host selectors minted so far (each mount defines its own component). */
let hostCount = 0

/** A mounted hook: settles change detection and tears the host down. */
interface HookMount {
  /** Runs change detection and settles the work it scheduled. */
  settle: () => Promise<void>
  /** Tears the host down (its `DestroyRef` cleanup runs, like an unmount). */
  destroy: () => Promise<void>
}

/**
 * Calls one function in an injection context, inside a real zoneless Angular
 * application, the way an app calls the hook.
 *
 * @param call - The hook call (a field-initializer expression).
 * @returns The mount.
 */
async function mountHook(call: () => void): Promise<HookMount> {
  const appRef = await createApplication({ providers: [provideZonelessChangeDetection()] })
  const Host = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: `mol-hook-host-${++hostCount}`,
    standalone: true,
    template: '',
  })(
    class HookHost {
      // A field initializer runs in the component's injection context.
      readonly result = call()
    },
  )
  const ref = createComponent(Host as Type<{ result: void }>, {
    environmentInjector: appRef.injector,
  })
  document.body.appendChild(ref.location.nativeElement)
  appRef.attachView(ref.hostView)
  return {
    settle: async () => {
      appRef.tick()
      await drain()
      await appRef.whenStable()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      ref.location.nativeElement.remove()
    },
  }
}

/** Drains microtasks and one macrotask turn, so scheduled work lands. */
const drain = async (): Promise<void> => {
  for (let i = 0; i < 3; i += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/** The mounts this file created; destroyed after every test, like React's roots. */
const mounts: HookMount[] = []
afterEach(async () => {
  for (const mount of mounts.splice(0)) await mount.destroy()
})

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
    // React re-renders the hook with a new closure; the Angular counterpart
    // swaps the signal the registration reads at call time.
    const handler = signal<(event: KeyboardEvent) => void>(first)
    const mount = await mountHook(() => {
      useKeyboardShortcut('mod+k', handler, { description: 'Open' })
    })
    mounts.push(mount)
    expect(f.registerMany).toHaveBeenCalledTimes(1)
    expect(f.registered.map((s) => s.keys)).toEqual(['ctrl+k', 'command+k'])
    handler.set(second)
    await mount.settle()
    expect(f.registerMany).toHaveBeenCalledTimes(1)
    const ev = new KeyboardEvent('keydown', { key: 'k' })
    f.registered[0]!.handler(ev)
    expect(second).toHaveBeenCalledWith(ev)
    expect(first).not.toHaveBeenCalled()
    mounts.length = 0
    await mount.destroy()
    expect(f.unregister).toHaveBeenCalledTimes(1)
  })

  it('does nothing when disabled or when no provider is bonded', async () => {
    const f = fakeProvider()
    mockGetProvider.mockReturnValue(f)
    const mount = await mountHook(() => {
      useKeyboardShortcut('/', () => {}, { enabled: false })
    })
    mounts.push(mount)
    expect(f.registerMany).not.toHaveBeenCalled()
    mockGetProvider.mockReturnValue(null)
    await expect(
      mountHook(() => {
        useKeyboardShortcut('/', () => {})
      }),
    ).resolves.toBeDefined()
    expect(f.registerMany).not.toHaveBeenCalled()
  })
})

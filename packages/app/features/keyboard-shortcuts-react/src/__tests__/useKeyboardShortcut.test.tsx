import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetProvider } = vi.hoisted(() => ({ mockGetProvider: vi.fn() }))
vi.mock('@molecule/app-keyboard-shortcuts', () => ({ getProvider: mockGetProvider }))

const { expandKeys, useKeyboardShortcut } = await import('../useKeyboardShortcut.js')

let root: Root | null = null
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
})

function mount(node: React.ReactElement) {
  const container = document.createElement('div')
  root = createRoot(container)
  act(() => root!.render(node))
}

interface Fake {
  registerMany: ReturnType<typeof vi.fn>
  unregister: ReturnType<typeof vi.fn>
  registered: Array<{ keys: string; handler: (e: KeyboardEvent) => void }>
}
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
    let handler = vi.fn()
    let force = () => {}
    function C() {
      const [, tick] = useState(0)
      force = () => tick((n) => n + 1)
      useKeyboardShortcut('mod+k', handler, { description: 'Open' })
      return null
    }
    mount(createElement(C))
    expect(f.registerMany).toHaveBeenCalledTimes(1)
    expect(f.registered.map((s) => s.keys)).toEqual(['ctrl+k', 'command+k'])
    const first = handler
    handler = vi.fn()
    act(() => force())
    expect(f.registerMany).toHaveBeenCalledTimes(1)
    const ev = new KeyboardEvent('keydown', { key: 'k' })
    f.registered[0].handler(ev)
    expect(handler).toHaveBeenCalledWith(ev)
    expect(first).not.toHaveBeenCalled()
    act(() => root!.unmount())
    root = null
    expect(f.unregister).toHaveBeenCalledTimes(1)
  })

  it('does nothing when disabled or when no provider is bonded', () => {
    const f = fakeProvider()
    mockGetProvider.mockReturnValue(f)
    function Off() {
      useKeyboardShortcut('/', () => {}, { enabled: false })
      return null
    }
    mount(createElement(Off))
    expect(f.registerMany).not.toHaveBeenCalled()
    act(() => root!.unmount())
    root = null
    mockGetProvider.mockReturnValue(null)
    function NoProvider() {
      useKeyboardShortcut('/', () => {})
      return null
    }
    expect(() => mount(createElement(NoProvider))).not.toThrow()
  })
})

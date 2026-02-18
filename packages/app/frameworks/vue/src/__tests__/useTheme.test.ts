/**
 * Tests for useTheme composable
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

let mockInjectReturnValue: unknown = undefined
const onMountedCallbacks: Array<() => void> = []
const onUnmountedCallbacks: Array<() => void> = []

// Mock Vue
vi.mock('vue', () => ({
  inject: vi.fn(() => mockInjectReturnValue),
  ref: vi.fn((v: unknown) => ({ value: v })),
  computed: vi.fn((fn: () => unknown) => ({ value: fn() })),
  onMounted: vi.fn((cb: () => void) => {
    onMountedCallbacks.push(cb)
  }),
  onUnmounted: vi.fn((cb: () => void) => {
    onUnmountedCallbacks.push(cb)
  }),
}))

// Mock molecule packages
vi.mock('@molecule/app-state', () => ({}))
vi.mock('@molecule/app-auth', () => ({}))
vi.mock('@molecule/app-theme', () => ({}))
vi.mock('@molecule/app-routing', () => ({}))
vi.mock('@molecule/app-i18n', () => ({}))
vi.mock('@molecule/app-http', () => ({}))
vi.mock('@molecule/app-storage', () => ({}))
vi.mock('@molecule/app-logger', () => ({}))
vi.mock('@molecule/app-forms', () => ({}))
vi.mock('@molecule/app-ui', () => ({}))

import {
  useCurrentTheme,
  useTheme,
  useThemeMode,
  useThemeProvider,
} from '../composables/useTheme.js'

const mockTheme = {
  name: 'light',
  mode: 'light' as const,
  colors: { background: { primary: '#fff' } },
}

describe('useThemeProvider', () => {
  beforeEach(() => {
    mockInjectReturnValue = undefined
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
  })

  it('returns the injected theme provider', () => {
    const mockProvider = { getTheme: vi.fn(), setTheme: vi.fn() }
    mockInjectReturnValue = mockProvider
    const result = useThemeProvider()
    expect(result).toBe(mockProvider)
  })

  it('throws when theme provider is not injected', () => {
    mockInjectReturnValue = undefined
    expect(() => useThemeProvider()).toThrow(
      'useThemeProvider requires ThemeProvider to be provided',
    )
  })
})

describe('useTheme', () => {
  let mockProvider: {
    getTheme: ReturnType<typeof vi.fn>
    setTheme: ReturnType<typeof vi.fn>
    getThemes: ReturnType<typeof vi.fn> | undefined
    subscribe: ReturnType<typeof vi.fn>
  }
  const mockUnsubscribe = vi.fn()

  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
    mockUnsubscribe.mockClear()

    mockProvider = {
      getTheme: vi.fn(() => mockTheme),
      setTheme: vi.fn(),
      getThemes: vi.fn(() => [
        { name: 'light', mode: 'light' },
        { name: 'dark', mode: 'dark' },
      ]),
      subscribe: vi.fn(() => {
        return mockUnsubscribe
      }),
    }
    mockInjectReturnValue = mockProvider
  })

  it('returns theme, themeName, mode, setTheme, toggleTheme', () => {
    const result = useTheme()
    expect(result.theme).toBeDefined()
    expect(result.themeName).toBeDefined()
    expect(result.mode).toBeDefined()
    expect(typeof result.setTheme).toBe('function')
    expect(typeof result.toggleTheme).toBe('function')
  })

  it('computed theme reflects initial theme', () => {
    const result = useTheme()
    expect(result.theme.value).toEqual(mockTheme)
  })

  it('computed themeName reflects initial name', () => {
    const result = useTheme()
    expect(result.themeName.value).toBe('light')
  })

  it('computed mode reflects initial mode', () => {
    const result = useTheme()
    expect(result.mode.value).toBe('light')
  })

  it('setTheme delegates to provider', () => {
    const result = useTheme()
    result.setTheme('dark')
    expect(mockProvider.setTheme).toHaveBeenCalledWith('dark')
  })

  it('toggleTheme cycles through available themes', () => {
    const result = useTheme()
    result.toggleTheme()
    // Current theme is 'light' (index 0), should toggle to 'dark' (index 1)
    expect(mockProvider.setTheme).toHaveBeenCalledWith({ name: 'dark', mode: 'dark' })
  })

  it('toggleTheme wraps around to first theme', () => {
    mockProvider.getTheme.mockReturnValue({ name: 'dark', mode: 'dark' })
    // Need fresh composable with dark theme
    const result = useTheme()
    result.toggleTheme()
    // Current theme is 'dark' (index 1), should wrap to 'light' (index 0)
    expect(mockProvider.setTheme).toHaveBeenCalledWith({ name: 'light', mode: 'light' })
  })

  it('toggleTheme handles missing getThemes gracefully', () => {
    mockProvider.getThemes = undefined
    const result = useTheme()
    // Should not throw, but use empty array fallback
    expect(() => result.toggleTheme()).not.toThrow()
  })

  it('subscribes on mount', () => {
    useTheme()
    expect(onMountedCallbacks.length).toBeGreaterThan(0)
    onMountedCallbacks[0]()
    expect(mockProvider.subscribe).toHaveBeenCalledTimes(1)
  })

  it('unsubscribes on unmount', () => {
    useTheme()
    onMountedCallbacks[0]()
    expect(onUnmountedCallbacks.length).toBeGreaterThan(0)
    onUnmountedCallbacks[0]()
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
  })

  it('handles unmount without prior mount', () => {
    useTheme()
    expect(onUnmountedCallbacks.length).toBeGreaterThan(0)
    expect(() => onUnmountedCallbacks[0]()).not.toThrow()
  })
})

describe('useCurrentTheme', () => {
  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
    mockInjectReturnValue = {
      getTheme: vi.fn(() => mockTheme),
      setTheme: vi.fn(),
      getThemes: vi.fn(() => []),
      subscribe: vi.fn(() => vi.fn()),
    }
  })

  it('returns the theme computed ref', () => {
    const result = useCurrentTheme()
    expect(result.value).toEqual(mockTheme)
  })
})

describe('useThemeMode', () => {
  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
    mockInjectReturnValue = {
      getTheme: vi.fn(() => mockTheme),
      setTheme: vi.fn(),
      getThemes: vi.fn(() => []),
      subscribe: vi.fn(() => vi.fn()),
    }
  })

  it('returns the mode computed ref', () => {
    const result = useThemeMode()
    expect(result.value).toBe('light')
  })
})

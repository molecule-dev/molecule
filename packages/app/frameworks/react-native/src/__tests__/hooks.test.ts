/**
 * Tests for React Native framework hooks.
 *
 * The hooks use dynamic `require('react-native')` inside try/catch to avoid
 * crashes on non-RN platforms. Since `vi.mock` only intercepts ESM imports
 * (not CJS `require` for non-installed modules), we mock `require` by
 * patching `Module._resolveFilename` and pre-populating `require.cache`.
 *
 * @module
 */

import { createRequire } from 'node:module'
import Module from 'node:module'

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// State tracking for React hook mocks
// ---------------------------------------------------------------------------

let stateSlots: Array<{ value: unknown; setter: (v: unknown) => void }> = []
let stateCallIndex = 0
const effectCallbacks: Array<() => (() => void) | undefined | void> = []

function resetHookState(): void {
  stateSlots = []
  stateCallIndex = 0
  effectCallbacks.length = 0
}

/**
 * Run all captured useEffect callbacks.
 * Returns the cleanup function from the last effect.
 */
function runEffects(): (() => void) | undefined {
  let cleanup: (() => void) | undefined
  for (const cb of effectCallbacks) {
    const result = cb()
    if (typeof result === 'function') {
      cleanup = result
    }
  }
  return cleanup
}

// ---------------------------------------------------------------------------
// Mock react (via vi.mock — this IS intercepted because react is installed)
// ---------------------------------------------------------------------------

vi.mock('react', () => ({
  useState: (initial: unknown) => {
    const idx = stateCallIndex++
    if (!stateSlots[idx]) {
      stateSlots[idx] = {
        value: initial,
        setter: (v: unknown) => {
          stateSlots[idx].value = v
        },
      }
    }
    return [stateSlots[idx].value, stateSlots[idx].setter]
  },
  useEffect: (cb: () => (() => void) | undefined | void, _deps?: unknown[]) => {
    effectCallbacks.push(cb)
  },
  useCallback: (cb: unknown) => cb,
  createContext: () => ({ Provider: 'MockProvider', Consumer: 'MockConsumer' }),
  useContext: () => null,
  useMemo: (fn: () => unknown) => fn(),
  useRef: (initial: unknown) => ({ current: initial }),
  useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot(),
}))

// ---------------------------------------------------------------------------
// Mock @molecule/app-react (via vi.mock — package exists in workspace)
// ---------------------------------------------------------------------------

vi.mock('@molecule/app-react', () => ({
  useAuth: vi.fn(),
  useTheme: vi.fn(),
  useRouter: vi.fn(),
  useHttp: vi.fn(),
  useStore: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Mock react-native and react-native-safe-area-context via require cache
// These modules are NOT installed, so vi.mock cannot intercept them.
// We patch Module._resolveFilename + require.cache to make require() work.
// ---------------------------------------------------------------------------

const _require = createRequire(import.meta.url)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const originalResolveFilename = (Module as any)._resolveFilename

const mockBackHandlerRemove = vi.fn()
const mockBackHandlerAddEventListener = vi.fn().mockReturnValue({ remove: mockBackHandlerRemove })

const mockAppStateRemove = vi.fn()
const mockAppStateAddEventListener = vi.fn().mockReturnValue({ remove: mockAppStateRemove })

const mockKeyboardRemoveShow = vi.fn()
const mockKeyboardRemoveHide = vi.fn()
const mockKeyboardAddListener = vi.fn().mockImplementation((event: string) => {
  if (event.includes('Show') || event.includes('show')) {
    return { remove: mockKeyboardRemoveShow }
  }
  return { remove: mockKeyboardRemoveHide }
})

const mockUseSafeAreaInsets = vi.fn().mockReturnValue({ top: 44, right: 0, bottom: 34, left: 0 })

const requireMockModules: Record<string, unknown> = {
  'react-native': {
    BackHandler: {
      addEventListener: mockBackHandlerAddEventListener,
    },
    AppState: {
      currentState: 'active',
      addEventListener: mockAppStateAddEventListener,
    },
    Keyboard: {
      addListener: mockKeyboardAddListener,
    },
    Platform: {
      OS: 'android',
    },
  },
  'react-native-safe-area-context': {
    useSafeAreaInsets: mockUseSafeAreaInsets,
  },
}

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(Module as any)._resolveFilename = function (request: string, ...args: unknown[]) {
    if (requireMockModules[request]) {
      return request
    }
    return originalResolveFilename.call(this, request, ...args)
  }

  for (const [name, exports] of Object.entries(requireMockModules)) {
    _require.cache[name] = {
      id: name,
      filename: name,
      loaded: true,
      exports,
    } as any // eslint-disable-line @typescript-eslint/no-explicit-any
  }
})

afterAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(Module as any)._resolveFilename = originalResolveFilename
  for (const name of Object.keys(requireMockModules)) {
    delete _require.cache[name]
  }
})

// ---------------------------------------------------------------------------
// Imports — must come after vi.mock declarations
// ---------------------------------------------------------------------------

import { useAppState } from '../hooks/useAppState.js'
import { useBackHandler } from '../hooks/useBackHandler.js'
import { useKeyboardHeight } from '../hooks/useKeyboardHeight.js'
import { useSafeArea } from '../hooks/useSafeArea.js'

// ---------------------------------------------------------------------------
// Setup/teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetHookState()
  vi.clearAllMocks()
  // Restore default mock return values after clearAllMocks
  mockBackHandlerAddEventListener.mockReturnValue({ remove: mockBackHandlerRemove })
  mockAppStateAddEventListener.mockReturnValue({ remove: mockAppStateRemove })
  mockKeyboardAddListener.mockImplementation((event: string) => {
    if (event.includes('Show') || event.includes('show')) {
      return { remove: mockKeyboardRemoveShow }
    }
    return { remove: mockKeyboardRemoveHide }
  })
  mockUseSafeAreaInsets.mockReturnValue({ top: 44, right: 0, bottom: 34, left: 0 })
})

afterEach(() => {
  resetHookState()
})

// ---------------------------------------------------------------------------
// useBackHandler
// ---------------------------------------------------------------------------

describe('useBackHandler', () => {
  it('registers a BackHandler listener on mount', () => {
    const handler = (): boolean => true

    useBackHandler(handler)
    runEffects()

    expect(mockBackHandlerAddEventListener).toHaveBeenCalledWith('hardwareBackPress', handler)
  })

  it('unregisters the listener on cleanup', () => {
    const handler = (): boolean => false

    useBackHandler(handler)
    const cleanup = runEffects()

    expect(cleanup).toBeDefined()
    cleanup!()
    expect(mockBackHandlerRemove).toHaveBeenCalled()
  })

  it('calls the handler when back is pressed', () => {
    const handler = vi.fn().mockReturnValue(true)

    useBackHandler(handler)
    runEffects()

    // The handler reference is passed directly to addEventListener
    const registeredHandler = mockBackHandlerAddEventListener.mock.calls[0][1]
    const result = registeredHandler()

    expect(handler).toHaveBeenCalled()
    expect(result).toBe(true)
  })

  it('handler returning false allows default back behavior', () => {
    const handler = vi.fn().mockReturnValue(false)

    useBackHandler(handler)
    runEffects()

    const registeredHandler = mockBackHandlerAddEventListener.mock.calls[0][1]
    const result = registeredHandler()

    expect(result).toBe(false)
  })

  it('does not register when enabled is false', () => {
    const handler = (): boolean => true

    useBackHandler(handler, { enabled: false })
    const cleanup = runEffects()

    expect(mockBackHandlerAddEventListener).not.toHaveBeenCalled()
    expect(cleanup).toBeUndefined()
  })

  it('registers when enabled is true (explicit)', () => {
    const handler = (): boolean => true

    useBackHandler(handler, { enabled: true })
    runEffects()

    expect(mockBackHandlerAddEventListener).toHaveBeenCalledWith('hardwareBackPress', handler)
  })

  it('defaults to enabled when no options provided', () => {
    const handler = (): boolean => false

    useBackHandler(handler)
    runEffects()

    expect(mockBackHandlerAddEventListener).toHaveBeenCalledWith('hardwareBackPress', handler)
  })
})

// ---------------------------------------------------------------------------
// useAppState
// ---------------------------------------------------------------------------

describe('useAppState', () => {
  it('returns initial app state as active', () => {
    const result = useAppState()

    expect(result.appState).toBe('active')
    expect(result.isActive).toBe(true)
  })

  it('registers an AppState change listener on mount', () => {
    useAppState()
    runEffects()

    expect(mockAppStateAddEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('unregisters the listener on cleanup', () => {
    useAppState()
    const cleanup = runEffects()

    expect(cleanup).toBeDefined()
    cleanup!()
    expect(mockAppStateRemove).toHaveBeenCalled()
  })

  it('updates state when AppState fires change event', () => {
    useAppState()
    runEffects()

    // Get the change handler that was registered
    const changeHandler = mockAppStateAddEventListener.mock.calls[0][1]
    changeHandler('background')

    // stateSlots[0] is appState (first useState call in useAppState)
    expect(stateSlots[0].value).toBe('background')
  })

  it('sets initial state from AppState.currentState on effect', () => {
    useAppState()
    runEffects()

    // The mock AppState.currentState is 'active', so the setter was called with 'active'
    expect(stateSlots[0].value).toBe('active')
  })

  it('isActive reflects whether appState is active', () => {
    const result = useAppState()

    // Initial state is 'active' (from useState default)
    expect(result.isActive).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// useKeyboardHeight
// ---------------------------------------------------------------------------

describe('useKeyboardHeight', () => {
  it('returns initial keyboard height as 0', () => {
    const result = useKeyboardHeight()

    expect(result.keyboardHeight).toBe(0)
    expect(result.isKeyboardVisible).toBe(false)
  })

  it('registers keyboard show and hide listeners on mount (Android)', () => {
    useKeyboardHeight()
    runEffects()

    // On Android (mocked Platform.OS = 'android'), events are keyboardDidShow/keyboardDidHide
    expect(mockKeyboardAddListener).toHaveBeenCalledTimes(2)
    expect(mockKeyboardAddListener).toHaveBeenCalledWith('keyboardDidShow', expect.any(Function))
    expect(mockKeyboardAddListener).toHaveBeenCalledWith('keyboardDidHide', expect.any(Function))
  })

  it('unregisters both listeners on cleanup', () => {
    useKeyboardHeight()
    const cleanup = runEffects()

    expect(cleanup).toBeDefined()
    cleanup!()
    expect(mockKeyboardRemoveShow).toHaveBeenCalled()
    expect(mockKeyboardRemoveHide).toHaveBeenCalled()
  })

  it('updates height when keyboard shows', () => {
    useKeyboardHeight()
    runEffects()

    // Get the show handler (first call to addListener — keyboardDidShow)
    const showHandler = mockKeyboardAddListener.mock.calls[0][1]
    showHandler({ endCoordinates: { height: 300 } })

    // stateSlots[0] is keyboardHeight (first useState call in useKeyboardHeight)
    expect(stateSlots[0].value).toBe(300)
  })

  it('resets height to 0 when keyboard hides', () => {
    useKeyboardHeight()
    runEffects()

    // First, simulate keyboard showing
    const showHandler = mockKeyboardAddListener.mock.calls[0][1]
    showHandler({ endCoordinates: { height: 250 } })
    expect(stateSlots[0].value).toBe(250)

    // Then simulate keyboard hiding
    const hideHandler = mockKeyboardAddListener.mock.calls[1][1]
    hideHandler()
    expect(stateSlots[0].value).toBe(0)
  })

  it('reports isKeyboardVisible based on height', () => {
    const result = useKeyboardHeight()

    // Initially keyboard height is 0
    expect(result.isKeyboardVisible).toBe(false)
    expect(result.keyboardHeight).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// useSafeArea
// ---------------------------------------------------------------------------

describe('useSafeArea', () => {
  it('returns safe area insets from react-native-safe-area-context', () => {
    const insets = useSafeArea()

    expect(insets).toEqual({ top: 44, right: 0, bottom: 34, left: 0 })
  })

  it('returns zero insets when the context provider throws', () => {
    mockUseSafeAreaInsets.mockImplementation(() => {
      throw new Error('No context provider')
    })

    const insets = useSafeArea()

    expect(insets).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
  })

  it('returns insets with all four edges', () => {
    const customInsets = { top: 20, right: 10, bottom: 30, left: 10 }
    mockUseSafeAreaInsets.mockReturnValue(customInsets)

    const insets = useSafeArea()

    expect(insets.top).toBe(20)
    expect(insets.right).toBe(10)
    expect(insets.bottom).toBe(30)
    expect(insets.left).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// index.ts re-exports
// ---------------------------------------------------------------------------

describe('index.ts re-exports', () => {
  it('re-exports all RN-specific hooks', async () => {
    const indexModule = await import('../index.js')

    expect(indexModule.useBackHandler).toBeDefined()
    expect(typeof indexModule.useBackHandler).toBe('function')

    expect(indexModule.useAppState).toBeDefined()
    expect(typeof indexModule.useAppState).toBe('function')

    expect(indexModule.useKeyboardHeight).toBeDefined()
    expect(typeof indexModule.useKeyboardHeight).toBe('function')

    expect(indexModule.useSafeArea).toBeDefined()
    expect(typeof indexModule.useSafeArea).toBe('function')
  })

  it('re-exports from @molecule/app-react', async () => {
    const indexModule = await import('../index.js')

    // These come from the @molecule/app-react re-export
    expect(indexModule).toHaveProperty('useAuth')
    expect(indexModule).toHaveProperty('useTheme')
    expect(indexModule).toHaveProperty('useRouter')
  })
})

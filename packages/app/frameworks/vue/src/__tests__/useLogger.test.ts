/**
 * Tests for useLogger composable
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

let mockInjectReturnValue: unknown = undefined

// Mock Vue
vi.mock('vue', () => ({
  inject: vi.fn(() => mockInjectReturnValue),
  ref: vi.fn((v: unknown) => ({ value: v })),
  computed: vi.fn((fn: () => unknown) => ({ value: fn() })),
  onMounted: vi.fn(),
  onUnmounted: vi.fn(),
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
  useChildLogger,
  useLogger,
  useLoggerProvider,
  useRootLogger,
} from '../composables/useLogger.js'

describe('useLoggerProvider', () => {
  beforeEach(() => {
    mockInjectReturnValue = undefined
  })

  it('returns the injected logger provider', () => {
    const mockProvider = { getLogger: vi.fn(), createLogger: vi.fn() }
    mockInjectReturnValue = mockProvider
    const result = useLoggerProvider()
    expect(result).toBe(mockProvider)
  })

  it('throws when logger provider is not injected', () => {
    mockInjectReturnValue = undefined
    expect(() => useLoggerProvider()).toThrow(
      'useLoggerProvider requires LoggerProvider to be provided',
    )
  })
})

interface MockLogger {
  info: ReturnType<typeof vi.fn>
  warn: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
  debug: ReturnType<typeof vi.fn>
  withContext: ReturnType<typeof vi.fn>
}

interface MockLoggerProvider {
  getLogger: ReturnType<typeof vi.fn>
  createLogger: ReturnType<typeof vi.fn>
}

describe('useLogger', () => {
  let mockProvider: MockLoggerProvider
  let mockLogger: MockLogger

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      withContext: vi.fn(),
    }

    mockProvider = {
      getLogger: vi.fn(() => mockLogger),
      createLogger: vi.fn(() => mockLogger),
    }
    mockInjectReturnValue = mockProvider
  })

  it('calls getLogger with the given name when no config', () => {
    const result = useLogger('MyComponent')
    expect(mockProvider.getLogger).toHaveBeenCalledWith('MyComponent')
    expect(result).toBe(mockLogger)
  })

  it('calls createLogger with name and config when config provided', () => {
    const config = { level: 'debug' }
    const result = useLogger('MyComponent', config as never)
    expect(mockProvider.createLogger).toHaveBeenCalledWith({ name: 'MyComponent', level: 'debug' })
    expect(result).toBe(mockLogger)
  })

  it('does not call createLogger when config is not provided', () => {
    useLogger('Test')
    expect(mockProvider.createLogger).not.toHaveBeenCalled()
  })

  it('does not call getLogger when config is provided', () => {
    useLogger('Test', { level: 'warn' } as never)
    expect(mockProvider.getLogger).not.toHaveBeenCalled()
  })
})

describe('useRootLogger', () => {
  let mockProvider: MockLoggerProvider
  let mockRootLogger: Omit<MockLogger, 'withContext'>

  beforeEach(() => {
    mockRootLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }

    mockProvider = {
      getLogger: vi.fn(() => mockRootLogger),
      createLogger: vi.fn(),
    }
    mockInjectReturnValue = mockProvider
  })

  it('returns the root logger (getLogger without name)', () => {
    const result = useRootLogger()
    expect(mockProvider.getLogger).toHaveBeenCalledWith()
    expect(result).toBe(mockRootLogger)
  })
})

describe('useChildLogger', () => {
  let mockProvider: MockLoggerProvider
  let mockParentLogger: MockLogger
  let mockChildLogger: Omit<MockLogger, 'withContext'>

  beforeEach(() => {
    mockChildLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }

    mockParentLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      withContext: vi.fn(() => mockChildLogger),
    }

    mockProvider = {
      getLogger: vi.fn(() => mockParentLogger),
      createLogger: vi.fn(),
    }
    mockInjectReturnValue = mockProvider
  })

  it('gets parent logger and creates child with context', () => {
    const context = { requestId: '123', userId: 'abc' }
    const result = useChildLogger('ParentComponent', context)
    expect(mockProvider.getLogger).toHaveBeenCalledWith('ParentComponent')
    expect(mockParentLogger.withContext).toHaveBeenCalledWith(context)
    expect(result).toBe(mockChildLogger)
  })

  it('passes context object to withContext', () => {
    const context = { module: 'auth', action: 'login' }
    useChildLogger('AuthModule', context)
    expect(mockParentLogger.withContext).toHaveBeenCalledWith({
      module: 'auth',
      action: 'login',
    })
  })
})

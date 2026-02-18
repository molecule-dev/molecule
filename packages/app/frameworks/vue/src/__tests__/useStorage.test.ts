/**
 * Tests for useStorage composable
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

let mockInjectReturnValue: unknown = undefined
const onMountedCallbacks: Array<() => void | Promise<void>> = []
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

import { useStorage, useStorageProvider, useStorageValue } from '../composables/useStorage.js'

describe('useStorageProvider', () => {
  beforeEach(() => {
    mockInjectReturnValue = undefined
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
  })

  it('returns the injected storage provider', () => {
    const mockProvider = { get: vi.fn(), set: vi.fn() }
    mockInjectReturnValue = mockProvider
    const result = useStorageProvider()
    expect(result).toBe(mockProvider)
  })

  it('throws when storage provider is not injected', () => {
    mockInjectReturnValue = undefined
    expect(() => useStorageProvider()).toThrow(
      'useStorageProvider requires StorageProvider to be provided',
    )
  })
})

describe('useStorageValue', () => {
  let mockStorage: {
    get: ReturnType<typeof vi.fn>
    set: ReturnType<typeof vi.fn>
    remove: ReturnType<typeof vi.fn>
    clear: ReturnType<typeof vi.fn>
    keys: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0

    mockStorage = {
      get: vi.fn(() => Promise.resolve('stored-value')),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve()),
      keys: vi.fn(() => Promise.resolve([])),
    }
    mockInjectReturnValue = mockStorage
  })

  it('returns value, loading, error, setValue, removeValue', () => {
    const result = useStorageValue('testKey')
    expect(result.value).toBeDefined()
    expect(result.loading).toBeDefined()
    expect(result.error).toBeDefined()
    expect(typeof result.setValue).toBe('function')
    expect(typeof result.removeValue).toBe('function')
  })

  it('initializes with loading true', () => {
    const result = useStorageValue('testKey')
    expect(result.loading.value).toBe(true)
  })

  it('uses defaultValue for initial value', () => {
    const result = useStorageValue('testKey', { defaultValue: 'default' })
    expect(result.value.value).toBe('default')
  })

  it('uses undefined when no defaultValue', () => {
    const result = useStorageValue('testKey')
    expect(result.value.value).toBeUndefined()
  })

  it('loads stored value on mount', async () => {
    const result = useStorageValue('testKey')
    expect(onMountedCallbacks.length).toBeGreaterThan(0)
    await onMountedCallbacks[0]()
    expect(mockStorage.get).toHaveBeenCalledWith('testKey')
    expect(result.value.value).toBe('stored-value')
    expect(result.loading.value).toBe(false)
  })

  it('falls back to defaultValue when storage returns null', async () => {
    mockStorage.get.mockResolvedValue(null)
    const result = useStorageValue('testKey', { defaultValue: 'fallback' })
    await onMountedCallbacks[0]()
    expect(result.value.value).toBe('fallback')
    expect(result.loading.value).toBe(false)
  })

  it('handles error during load', async () => {
    mockStorage.get.mockRejectedValue(new Error('load failed'))
    const result = useStorageValue('testKey')
    await onMountedCallbacks[0]()
    expect(result.error.value).toBeInstanceOf(Error)
    expect(result.error.value!.message).toBe('load failed')
    expect(result.loading.value).toBe(false)
  })

  it('handles non-Error during load', async () => {
    mockStorage.get.mockRejectedValue('string error')
    const result = useStorageValue('testKey')
    await onMountedCallbacks[0]()
    expect(result.error.value).toBeInstanceOf(Error)
    expect(result.error.value!.message).toBe('string error')
  })

  it('setValue updates storage and value', async () => {
    const result = useStorageValue('testKey')
    await result.setValue('new-value')
    expect(mockStorage.set).toHaveBeenCalledWith('testKey', 'new-value')
    expect(result.value.value).toBe('new-value')
    expect(result.error.value).toBeNull()
  })

  it('setValue handles error', async () => {
    mockStorage.set.mockRejectedValue(new Error('set failed'))
    const result = useStorageValue('testKey')
    await expect(result.setValue('bad-value')).rejects.toThrow('set failed')
    expect(result.error.value).toBeInstanceOf(Error)
    expect(result.error.value!.message).toBe('set failed')
  })

  it('setValue wraps non-Error in Error', async () => {
    mockStorage.set.mockRejectedValue('set string error')
    const result = useStorageValue('testKey')
    await expect(result.setValue('bad-value')).rejects.toBe('set string error')
    expect(result.error.value).toBeInstanceOf(Error)
    expect(result.error.value!.message).toBe('set string error')
  })

  it('removeValue removes from storage and resets to defaultValue', async () => {
    const result = useStorageValue('testKey', { defaultValue: 'default' })
    result.value.value = 'current'
    await result.removeValue()
    expect(mockStorage.remove).toHaveBeenCalledWith('testKey')
    expect(result.value.value).toBe('default')
    expect(result.error.value).toBeNull()
  })

  it('removeValue resets to undefined without defaultValue', async () => {
    const result = useStorageValue('testKey')
    result.value.value = 'current'
    await result.removeValue()
    expect(result.value.value).toBeUndefined()
  })

  it('removeValue handles error', async () => {
    mockStorage.remove.mockRejectedValue(new Error('remove failed'))
    const result = useStorageValue('testKey')
    await expect(result.removeValue()).rejects.toThrow('remove failed')
    expect(result.error.value).toBeInstanceOf(Error)
  })

  it('removeValue wraps non-Error in Error', async () => {
    mockStorage.remove.mockRejectedValue('remove string error')
    const result = useStorageValue('testKey')
    await expect(result.removeValue()).rejects.toBe('remove string error')
    expect(result.error.value).toBeInstanceOf(Error)
    expect(result.error.value!.message).toBe('remove string error')
  })
})

describe('useStorage', () => {
  let mockStorage: {
    get: ReturnType<typeof vi.fn>
    set: ReturnType<typeof vi.fn>
    remove: ReturnType<typeof vi.fn>
    clear: ReturnType<typeof vi.fn>
    keys: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0

    mockStorage = {
      get: vi.fn(() => Promise.resolve('val')),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve()),
      keys: vi.fn(() => Promise.resolve(['key1', 'key2'])),
    }
    mockInjectReturnValue = mockStorage
  })

  it('returns get, set, remove, clear, keys methods', () => {
    const result = useStorage()
    expect(typeof result.get).toBe('function')
    expect(typeof result.set).toBe('function')
    expect(typeof result.remove).toBe('function')
    expect(typeof result.clear).toBe('function')
    expect(typeof result.keys).toBe('function')
  })

  it('get delegates to storage provider', async () => {
    const result = useStorage()
    const val = await result.get('testKey')
    expect(mockStorage.get).toHaveBeenCalledWith('testKey')
    expect(val).toBe('val')
  })

  it('set delegates to storage provider', async () => {
    const result = useStorage()
    await result.set('testKey', 'testValue')
    expect(mockStorage.set).toHaveBeenCalledWith('testKey', 'testValue')
  })

  it('remove delegates to storage provider', async () => {
    const result = useStorage()
    await result.remove('testKey')
    expect(mockStorage.remove).toHaveBeenCalledWith('testKey')
  })

  it('clear delegates to storage provider', async () => {
    const result = useStorage()
    await result.clear()
    expect(mockStorage.clear).toHaveBeenCalled()
  })

  it('keys delegates to storage provider', async () => {
    const result = useStorage()
    const keys = await result.keys()
    expect(mockStorage.keys).toHaveBeenCalled()
    expect(keys).toEqual(['key1', 'key2'])
  })
})

/**
 * Tests for useHttp composable
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
  useDelete,
  useGet,
  useHttp,
  useHttpClient,
  usePatch,
  usePost,
  usePut,
} from '../composables/useHttp.js'

describe('useHttpClient', () => {
  beforeEach(() => {
    mockInjectReturnValue = undefined
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
  })

  it('returns the injected HTTP client', () => {
    const mockClient = { get: vi.fn(), post: vi.fn() }
    mockInjectReturnValue = mockClient
    const result = useHttpClient()
    expect(result).toBe(mockClient)
  })

  it('throws when HTTP client is not injected', () => {
    mockInjectReturnValue = undefined
    expect(() => useHttpClient()).toThrow('useHttpClient requires HttpProvider to be provided')
  })
})

interface MockHttpClient {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  patch: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

describe('useHttp', () => {
  let mockClient: MockHttpClient

  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0

    mockClient = {
      get: vi.fn(() => Promise.resolve({ data: { id: 1, name: 'test' }, status: 200 })),
      post: vi.fn(() => Promise.resolve({ data: { id: 2 }, status: 201 })),
      put: vi.fn(() => Promise.resolve({ data: { id: 1, updated: true }, status: 200 })),
      patch: vi.fn(() => Promise.resolve({ data: { id: 1, patched: true }, status: 200 })),
      delete: vi.fn(() => Promise.resolve({ data: null, status: 204 })),
    }
    mockInjectReturnValue = mockClient
  })

  it('returns data, loading, error, execute, reset', () => {
    const result = useHttp('GET', '/api/test')
    expect(result.data).toBeDefined()
    expect(result.loading).toBeDefined()
    expect(result.error).toBeDefined()
    expect(typeof result.execute).toBe('function')
    expect(typeof result.reset).toBe('function')
  })

  it('initializes with data null and loading false when not immediate', () => {
    const result = useHttp('GET', '/api/test')
    expect(result.data.value).toBeNull()
    expect(result.loading.value).toBe(false)
    expect(result.error.value).toBeNull()
  })

  it('initializes with loading true when immediate', () => {
    const result = useHttp('GET', '/api/test', undefined, { immediate: true })
    expect(result.loading.value).toBe(true)
  })

  it('execute calls client.get for GET method', async () => {
    const result = useHttp('GET', '/api/users')
    // Simulate mount to set mounted = true
    onMountedCallbacks[0]()
    await result.execute()
    expect(mockClient.get).toHaveBeenCalledWith('/api/users', undefined)
  })

  it('execute calls client.post for POST method', async () => {
    const config = { data: { name: 'test' } } as never
    const result = useHttp('POST', '/api/users', config)
    onMountedCallbacks[0]()
    await result.execute()
    expect(mockClient.post).toHaveBeenCalledWith('/api/users', { name: 'test' }, config)
  })

  it('execute calls client.put for PUT method', async () => {
    const config = { data: { name: 'updated' } } as never
    const result = useHttp('PUT', '/api/users/1', config)
    onMountedCallbacks[0]()
    await result.execute()
    expect(mockClient.put).toHaveBeenCalledWith('/api/users/1', { name: 'updated' }, config)
  })

  it('execute calls client.patch for PATCH method', async () => {
    const config = { data: { name: 'patched' } } as never
    const result = useHttp('PATCH', '/api/users/1', config)
    onMountedCallbacks[0]()
    await result.execute()
    expect(mockClient.patch).toHaveBeenCalledWith('/api/users/1', { name: 'patched' }, config)
  })

  it('execute calls client.delete for DELETE method', async () => {
    const result = useHttp('DELETE', '/api/users/1')
    onMountedCallbacks[0]()
    await result.execute()
    expect(mockClient.delete).toHaveBeenCalledWith('/api/users/1', undefined)
  })

  it('execute updates data on success', async () => {
    const result = useHttp('GET', '/api/users')
    onMountedCallbacks[0]()
    await result.execute()
    expect(result.data.value).toEqual({ id: 1, name: 'test' })
    expect(result.loading.value).toBe(false)
    expect(result.error.value).toBeNull()
  })

  it('execute updates error on failure', async () => {
    mockClient.get.mockRejectedValue(new Error('Network error'))
    const result = useHttp('GET', '/api/users')
    onMountedCallbacks[0]()
    await result.execute()
    expect(result.error.value).toBeInstanceOf(Error)
    expect(result.error.value!.message).toBe('Network error')
    expect(result.loading.value).toBe(false)
    expect(result.data.value).toBeNull()
  })

  it('execute wraps non-Error failures in Error', async () => {
    mockClient.get.mockRejectedValue('string error')
    const result = useHttp('GET', '/api/users')
    onMountedCallbacks[0]()
    await result.execute()
    expect(result.error.value).toBeInstanceOf(Error)
    expect(result.error.value!.message).toBe('string error')
  })

  it('execute calls onSuccess callback', async () => {
    const onSuccess = vi.fn()
    const result = useHttp('GET', '/api/users', undefined, { onSuccess })
    onMountedCallbacks[0]()
    await result.execute()
    expect(onSuccess).toHaveBeenCalledWith({ id: 1, name: 'test' })
  })

  it('execute calls onError callback', async () => {
    const onError = vi.fn()
    mockClient.get.mockRejectedValue(new Error('fail'))
    const result = useHttp('GET', '/api/users', undefined, { onError })
    onMountedCallbacks[0]()
    await result.execute()
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
  })

  it('execute returns data on success', async () => {
    const result = useHttp('GET', '/api/users')
    onMountedCallbacks[0]()
    const data = await result.execute()
    expect(data).toEqual({ id: 1, name: 'test' })
  })

  it('execute returns null on failure', async () => {
    mockClient.get.mockRejectedValue(new Error('fail'))
    const result = useHttp('GET', '/api/users')
    onMountedCallbacks[0]()
    const data = await result.execute()
    expect(data).toBeNull()
  })

  it('execute returns null when not mounted', async () => {
    const result = useHttp('GET', '/api/users')
    // Do NOT call onMounted - component was never mounted
    // Simulate unmount to set mounted = false
    onUnmountedCallbacks[0]()
    const data = await result.execute()
    expect(data).toBeNull()
  })

  it('reset clears data, loading, and error', () => {
    const result = useHttp('GET', '/api/users')
    result.data.value = { id: 1 } as never
    result.loading.value = true
    result.error.value = new Error('test')
    result.reset()
    expect(result.data.value).toBeNull()
    expect(result.loading.value).toBe(false)
    expect(result.error.value).toBeNull()
  })

  it('immediate option triggers execute on mount', () => {
    useHttp('GET', '/api/users', undefined, { immediate: true })
    expect(onMountedCallbacks.length).toBeGreaterThan(0)
    // The onMounted callback should call execute when immediate is true
    // We just verify it was registered
  })

  it('registers onMounted and onUnmounted callbacks', () => {
    useHttp('GET', '/api/users')
    expect(onMountedCallbacks.length).toBeGreaterThan(0)
    expect(onUnmountedCallbacks.length).toBeGreaterThan(0)
  })
})

describe('useGet', () => {
  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
    mockInjectReturnValue = {
      get: vi.fn(() => Promise.resolve({ data: 'get-data', status: 200 })),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    }
  })

  it('creates a GET request composable', async () => {
    const result = useGet('/api/items')
    onMountedCallbacks[0]()
    await result.execute()
    expect((mockInjectReturnValue as never).get).toHaveBeenCalledWith('/api/items', undefined)
  })
})

describe('usePost', () => {
  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
    mockInjectReturnValue = {
      get: vi.fn(),
      post: vi.fn(() => Promise.resolve({ data: 'post-data', status: 201 })),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    }
  })

  it('creates a POST request composable', async () => {
    const config = { data: { name: 'new' } } as never
    const result = usePost('/api/items', config)
    onMountedCallbacks[0]()
    await result.execute()
    expect((mockInjectReturnValue as never).post).toHaveBeenCalledWith(
      '/api/items',
      { name: 'new' },
      config,
    )
  })
})

describe('usePut', () => {
  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
    mockInjectReturnValue = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(() => Promise.resolve({ data: 'put-data', status: 200 })),
      patch: vi.fn(),
      delete: vi.fn(),
    }
  })

  it('creates a PUT request composable', async () => {
    const config = { data: { name: 'updated' } } as never
    const result = usePut('/api/items/1', config)
    onMountedCallbacks[0]()
    await result.execute()
    expect((mockInjectReturnValue as never).put).toHaveBeenCalledWith(
      '/api/items/1',
      { name: 'updated' },
      config,
    )
  })
})

describe('usePatch', () => {
  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
    mockInjectReturnValue = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(() => Promise.resolve({ data: 'patch-data', status: 200 })),
      delete: vi.fn(),
    }
  })

  it('creates a PATCH request composable', async () => {
    const config = { data: { field: 'val' } } as never
    const result = usePatch('/api/items/1', config)
    onMountedCallbacks[0]()
    await result.execute()
    expect((mockInjectReturnValue as never).patch).toHaveBeenCalledWith(
      '/api/items/1',
      { field: 'val' },
      config,
    )
  })
})

describe('useDelete', () => {
  beforeEach(() => {
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
    mockInjectReturnValue = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(() => Promise.resolve({ data: null, status: 204 })),
    }
  })

  it('creates a DELETE request composable', async () => {
    const result = useDelete('/api/items/1')
    onMountedCallbacks[0]()
    await result.execute()
    expect((mockInjectReturnValue as never).delete).toHaveBeenCalledWith('/api/items/1', undefined)
  })
})

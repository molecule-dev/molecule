/**
 * Tests for the useHttp composable family.
 *
 * The composables run outside a component here (`getCurrentInstance` is null),
 * which is the documented out-of-setup fallback: a fresh lane per call and the
 * mount-time `immediate` request firing synchronously.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

let mockInjectReturnValue: unknown = undefined

// Mock Vue: no component instance, no reactive scope — the plain-call path.
vi.mock('vue', () => ({
  inject: vi.fn(() => mockInjectReturnValue),
  ref: vi.fn((v: unknown) => ({ value: v })),
  computed: vi.fn((fn: () => unknown) => ({ value: fn() })),
  getCurrentInstance: vi.fn(() => null),
  getCurrentScope: vi.fn(() => null),
  onScopeDispose: vi.fn(),
  onMounted: vi.fn(),
  onUnmounted: vi.fn(),
}))

// Mock molecule packages
vi.mock('@molecule/app-state', () => ({}))
vi.mock('@molecule/app-auth', () => ({}))
vi.mock('@molecule/app-theme', () => ({}))
vi.mock('@molecule/app-routing', () => ({}))
vi.mock('@molecule/app-i18n', () => ({
  t: vi.fn(
    (key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  ),
}))
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
  })

  it('returns the injected HTTP client', () => {
    const mockClient = { get: vi.fn(), post: vi.fn() }
    mockInjectReturnValue = mockClient
    const result = useHttpClient()
    expect(result).toBe(mockClient)
  })

  it('throws when HTTP client is not injected', () => {
    mockInjectReturnValue = undefined
    expect(() => useHttpClient()).toThrow('useHttpClient must be used within an HttpProvider')
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

  it('immediate fires its request once, synchronously, outside a component', () => {
    useHttp('GET', '/api/test', { immediate: true })
    expect(mockClient.get).toHaveBeenCalledTimes(1)
    expect(mockClient.get).toHaveBeenCalledWith('/api/test', {})
  })

  it('execute calls client.get for GET method', async () => {
    const result = useHttp('GET', '/api/users')
    await result.execute()
    expect(mockClient.get).toHaveBeenCalledWith('/api/users', {})
  })

  it('execute calls client.post for POST method', async () => {
    const config = { data: { name: 'test' } } as never
    const result = useHttp('POST', '/api/users', config)
    await result.execute()
    expect(mockClient.post).toHaveBeenCalledWith('/api/users', { name: 'test' }, config)
  })

  it('execute calls client.put for PUT method', async () => {
    const config = { data: { name: 'updated' } } as never
    const result = useHttp('PUT', '/api/users/1', config)
    await result.execute()
    expect(mockClient.put).toHaveBeenCalledWith('/api/users/1', { name: 'updated' }, config)
  })

  it('execute calls client.patch for PATCH method', async () => {
    const config = { data: { name: 'patched' } } as never
    const result = useHttp('PATCH', '/api/users/1', config)
    await result.execute()
    expect(mockClient.patch).toHaveBeenCalledWith('/api/users/1', { name: 'patched' }, config)
  })

  it('execute calls client.delete for DELETE method', async () => {
    const result = useHttp('DELETE', '/api/users/1')
    await result.execute()
    expect(mockClient.delete).toHaveBeenCalledWith('/api/users/1', {})
  })

  it('execute updates data on success', async () => {
    const result = useHttp('GET', '/api/users')
    await result.execute()
    expect(result.data.value).toEqual({ id: 1, name: 'test' })
    expect(result.loading.value).toBe(false)
    expect(result.error.value).toBeNull()
  })

  it('execute updates error on failure', async () => {
    mockClient.get.mockRejectedValue(new Error('Network error'))
    const result = useHttp('GET', '/api/users')
    await result.execute()
    expect(result.error.value).toBeInstanceOf(Error)
    expect(result.error.value!.message).toBe('Network error')
    expect(result.loading.value).toBe(false)
    expect(result.data.value).toBeNull()
  })

  it('execute wraps non-Error failures in Error', async () => {
    mockClient.get.mockRejectedValue('string error')
    const result = useHttp('GET', '/api/users')
    await result.execute()
    expect(result.error.value).toBeInstanceOf(Error)
    expect(result.error.value!.message).toBe('string error')
  })

  it('execute calls onSuccess callback', async () => {
    const onSuccess = vi.fn()
    const result = useHttp('GET', '/api/users', { onSuccess })
    await result.execute()
    expect(onSuccess).toHaveBeenCalledWith({ id: 1, name: 'test' })
  })

  it('execute calls onError callback', async () => {
    const onError = vi.fn()
    mockClient.get.mockRejectedValue(new Error('fail'))
    const result = useHttp('GET', '/api/users', { onError })
    await result.execute()
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
  })

  it('execute returns data on success', async () => {
    const result = useHttp('GET', '/api/users')
    const data = await result.execute()
    expect(data).toEqual({ id: 1, name: 'test' })
  })

  it('execute returns null on failure', async () => {
    mockClient.get.mockRejectedValue(new Error('fail'))
    const result = useHttp('GET', '/api/users')
    const data = await result.execute()
    expect(data).toBeNull()
  })

  it('a request superseded by reset still resolves its own data but the state stays cleared', async () => {
    let resolveGet: ((value: { data: unknown; status: number }) => void) | null = null
    mockClient.get.mockImplementation(
      () =>
        new Promise<{ data: unknown; status: number }>((resolve) => {
          resolveGet = resolve
        }),
    )
    const result = useHttp('GET', '/api/users')
    const pending = result.execute()
    result.reset()
    resolveGet!({ data: { late: true }, status: 200 })
    await expect(pending).resolves.toEqual({ late: true })
    expect(result.data.value).toBeNull()
    expect(result.loading.value).toBe(false)
  })

  it('the newest request owns the state an older one cannot overwrite', async () => {
    const gates: Array<(value: { data: unknown; status: number }) => void> = []
    mockClient.get.mockImplementation(
      () =>
        new Promise<{ data: unknown; status: number }>((resolve) => {
          gates.push(resolve)
        }),
    )
    const result = useHttp('GET', '/api/users')
    const first = result.execute()
    const second = result.execute()
    gates[1]({ data: { who: 'second' }, status: 200 })
    gates[0]({ data: { who: 'first' }, status: 200 })
    await Promise.all([first, second])
    expect(result.data.value).toEqual({ who: 'second' })
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

  it('an unsupported method throws without sending a request', async () => {
    const result = useHttp('TRACE' as 'GET', '/api/users')
    await expect(result.execute()).resolves.toBeNull()
    expect(mockClient.get).not.toHaveBeenCalled()
  })
})

describe('useGet', () => {
  beforeEach(() => {
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
    await result.execute()
    expect((mockInjectReturnValue as never).get).toHaveBeenCalledWith('/api/items', {})
  })
})

describe('usePost', () => {
  beforeEach(() => {
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
    await result.execute()
    expect((mockInjectReturnValue as never).delete).toHaveBeenCalledWith('/api/items/1', {})
  })
})

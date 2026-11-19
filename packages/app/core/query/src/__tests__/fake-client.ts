import { type Mock, vi } from 'vitest'

import type { QueryClient, QueryKey, QueryState } from '../types.js'

/** A {@link QueryClient} whose writes are recorded mocks. */
export type FakeQueryClient = QueryClient & {
  set: Mock<(key: QueryKey, data: unknown) => void>
  invalidate: Mock<(key: QueryKey) => void>
  clear: Mock<() => void>
}

/**
 * A complete {@link QueryClient} for tests that watch what a caller writes to the cache: `set`,
 * `invalidate` and `clear` are mocks, every read finds nothing cached, and `fetch` rejects, so a
 * test that unexpectedly reads through the client fails instead of passing on a stub.
 *
 * @returns A fresh client.
 */
export function fakeQueryClient(): FakeQueryClient {
  const idle = <T>(): QueryState<T> => ({
    data: undefined,
    status: 'idle',
    error: undefined,
    isFetching: false,
    updatedAt: undefined,
  })
  return {
    get: () => undefined,
    getState: idle,
    fetch: () => Promise.reject(new Error('fakeQueryClient: fetch is not part of this test')),
    prefetch: () => undefined,
    set: vi.fn<(key: QueryKey, data: unknown) => void>(),
    invalidate: vi.fn<(key: QueryKey) => void>(),
    subscribe: () => () => undefined,
    clear: vi.fn<() => void>(),
  }
}

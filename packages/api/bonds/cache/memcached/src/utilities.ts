/**
 * Utility functions for Memcached operations.
 *
 * @module
 */

import type Memcached from 'memcached'

/**
 * Wraps a callback-based Memcached client with promise-based methods
 * for `get`, `set`, `del`, `getMulti`, `flush`, and `end`.
 *
 * @param client - The Memcached client instance to wrap.
 * @returns An object with promisified versions of each Memcached operation.
 */
export const promisify = (
  client: Memcached,
): {
  get: <T>(key: string) => Promise<T | undefined>
  set: (key: string, value: unknown, ttl: number) => Promise<boolean>
  del: (key: string) => Promise<boolean>
  getMulti: <T>(keys: string[]) => Promise<Record<string, T>>
  flush: () => Promise<boolean[]>
  end: () => void
} => ({
  get: <T>(key: string): Promise<T | undefined> =>
    new Promise((resolve, reject) => {
      client.get(key, (err, data) => {
        if (err) reject(err)
        else resolve(data as T | undefined)
      })
    }),

  set: (key: string, value: unknown, ttl: number): Promise<boolean> =>
    new Promise((resolve, reject) => {
      client.set(key, value, ttl, (err, result) => {
        if (err) reject(err)
        else resolve(result)
      })
    }),

  del: (key: string): Promise<boolean> =>
    new Promise((resolve, reject) => {
      client.del(key, (err, result) => {
        if (err) reject(err)
        else resolve(result)
      })
    }),

  getMulti: <T>(keys: string[]): Promise<Record<string, T>> =>
    new Promise((resolve, reject) => {
      client.getMulti(keys, (err, data) => {
        if (err) reject(err)
        else resolve(data as Record<string, T>)
      })
    }),

  flush: (): Promise<boolean[]> =>
    new Promise((resolve, reject) => {
      client.flush((err, results) => {
        if (err) reject(err)
        else resolve(results)
      })
    }),

  end: (): void => {
    client.end()
  },
})

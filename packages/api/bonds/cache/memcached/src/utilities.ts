/**
 * Utility functions for Memcached operations.
 *
 * @module
 */

import type Memcached from 'memcached'

/**
 * Wraps a callback-based Memcached client with promise-based methods
 * for `get`, `set`, `add`, `append`, `incr`, `del`, `getMulti`, and `end`.
 *
 * @param client - The Memcached client instance to wrap.
 * @returns An object with promisified versions of each Memcached operation.
 */
export const promisify = (
  client: Memcached,
): {
  get: <T>(key: string) => Promise<T | undefined>
  set: (key: string, value: unknown, ttl: number) => Promise<boolean>
  add: (key: string, value: unknown, ttl: number) => Promise<boolean>
  append: (key: string, value: unknown) => Promise<boolean>
  incr: (key: string, amount: number) => Promise<boolean | number>
  del: (key: string) => Promise<boolean>
  getMulti: <T>(keys: string[]) => Promise<Record<string, T>>
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

  // Stores the value ONLY if the key does not already exist — used to
  // race-safely seed a well-known key (the cache-namespace version, a tag log)
  // exactly once, regardless of how many processes attempt it concurrently.
  //
  // A REAL memcached server answers NOT_STORED when the key already exists,
  // and the client surfaces that as an Error carrying `notStored: true` — NOT
  // as a false result. That is this method's documented "lost the create
  // race" outcome, not a failure, so it must resolve `false` rather than
  // reject (rejecting broke the tag log against a live server; an in-memory
  // fake that resolves false instead masked it).
  add: (key: string, value: unknown, ttl: number): Promise<boolean> =>
    new Promise((resolve, reject) => {
      client.add(key, value, ttl, (err, result) => {
        if (err && (err as Error & { notStored?: boolean }).notStored) resolve(false)
        else if (err) reject(err)
        else resolve(result)
      })
    }),

  // Appends to an EXISTING value atomically at the server — unlike a
  // get-modify-set round trip, two concurrent appends can never silently
  // clobber each other's write. NOT_STORED here means "the key does not exist
  // yet" (same client Error-with-`notStored` shape as `add`) — the caller's
  // documented cue to create it, so it resolves `false` rather than rejects.
  append: (key: string, value: unknown): Promise<boolean> =>
    new Promise((resolve, reject) => {
      client.append(key, value, (err, result) => {
        if (err && (err as Error & { notStored?: boolean }).notStored) resolve(false)
        else if (err) reject(err)
        else resolve(result)
      })
    }),

  // Atomically increments a numeric value. Resolves `false` (not an error) if
  // the key does not exist — memcached's INCR does not auto-vivify.
  incr: (key: string, amount: number): Promise<boolean | number> =>
    new Promise((resolve, reject) => {
      client.incr(key, amount, (err, result) => {
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

  end: (): void => {
    client.end()
  },
})

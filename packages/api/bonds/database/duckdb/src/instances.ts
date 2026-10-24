/**
 * Opens DuckDB instances and shares one instance per database file.
 *
 * @module
 */

import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { DuckDBInstance } from '@duckdb/node-api'

import { ConnectionLock } from './queue.js'
import type { DuckdbConfig } from './types.js'

/** The in-memory database path. */
export const MEMORY_PATH = ':memory:'

/** Default on-disk database path. */
export const DEFAULT_DUCKDB_PATH = './data/app.duckdb'

/** Default `memory_limit`: DuckDB's own default is 80% of RAM — far too much on a shared host. */
export const DEFAULT_MEMORY_LIMIT = '1GB'

/** Default `threads`: DuckDB's own default is every core — oversubscribes a shared host. */
export const DEFAULT_THREADS = 4

/**
 * One opened database: the DuckDB instance, the lock over its single pooled
 * connection, and how many pools currently use it.
 */
export interface DuckdbInstanceHandle {
  /** The DuckDB instance. */
  instance: DuckDBInstance
  /** FIFO lock over the pool's single connection. */
  lock: ConnectionLock
  /** The resolved path (`':memory:'` for in-memory). */
  path: string
  /** Pools currently using this instance. */
  refs: number
}

/** In-memory instances, each private to the pool that opened it. */
const memoryHandles = new Set<DuckdbInstanceHandle>()

/**
 * One lock per shared FILE instance: `fromCache` hands every pool on a path
 * the SAME instance object, so the lock is keyed off that object — two pools
 * on one file then share one queue (and cannot race each other's writes),
 * while each `:memory:` pool owns its own lock via its private handle.
 */
const sharedLocks = new WeakMap<DuckDBInstance, ConnectionLock>()

/**
 * Resolve the effective instance options for a config: sane `memory_limit` and
 * `threads` defaults (DuckDB's own defaults are 80% of RAM and every core,
 * which let one in-process engine eat a shared VM whole), `access_mode` for
 * `readOnly`, env overrides, then the caller's raw `config` map on top.
 *
 * @param config - Pool configuration.
 * @returns The options for `DuckDBInstance.fromCache(path, options)`.
 */
export function instanceOptionsFor(config?: DuckdbConfig): Record<string, string> {
  const memoryLimit = config?.memoryLimit ?? process.env.DUCKDB_MEMORY_LIMIT ?? DEFAULT_MEMORY_LIMIT
  const threads = String(
    config?.threads ??
      (process.env.DUCKDB_THREADS != null && process.env.DUCKDB_THREADS !== ''
        ? process.env.DUCKDB_THREADS
        : DEFAULT_THREADS),
  )
  return {
    memory_limit: memoryLimit,
    threads,
    ...(config?.readOnly ? { access_mode: 'READ_ONLY' } : {}),
    ...(config?.config ?? {}),
  }
}

/**
 * Pick the database path from config, then `DUCKDB_PATH`, then the default.
 *
 * @param config - Pool configuration.
 * @returns The path as given (not yet resolved).
 */
export function choosePath(config?: DuckdbConfig): string {
  if (config?.path) return config.path
  const fromEnv = process.env.DUCKDB_PATH
  if (fromEnv) return fromEnv
  return DEFAULT_DUCKDB_PATH
}

/**
 * Open (or join) the instance for a pool.
 *
 * A FILE path goes through `DuckDBInstance.fromCache`: the official answer to
 * "two instances must never open the same file" — every pool in this process
 * on one file shares one instance (and one write lock). In-memory databases
 * are always PRIVATE (a shared `:memory:` cache entry would hand two test
 * pools one database), so they use a fresh `create` and are closed when their
 * last pool ends. File-backed cached instances are NEVER closed by this
 * module: the client's cache has no eviction, and closing a cached instance
 * would hand the next `fromCache` caller a dead one — they live for the
 * process, which is also why a file path must not be reused across processes
 * in read-write mode.
 *
 * @param config - Pool configuration.
 * @returns The instance, with a reference taken for the caller.
 */
export async function acquireInstance(config?: DuckdbConfig): Promise<DuckdbInstanceHandle> {
  const path = choosePath(config)
  const options = instanceOptionsFor(config)

  if (path === MEMORY_PATH) {
    const instance = await DuckDBInstance.create(path, options)
    const handle: DuckdbInstanceHandle = { instance, lock: new ConnectionLock(), path, refs: 1 }
    memoryHandles.add(handle)
    return handle
  }

  const dir = dirname(path)
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const resolved = resolve(path)
  const instance = await DuckDBInstance.fromCache(resolved, options)
  let lock = sharedLocks.get(instance)
  if (!lock) {
    lock = new ConnectionLock()
    sharedLocks.set(instance, lock)
  }
  return { instance, lock, path: resolved, refs: 1 }
}

/**
 * Drop a pool's reference; close the instance when no pool uses it and it is
 * one of this module's private in-memory instances.
 *
 * @param handle - The instance to release.
 */
export function releaseInstance(handle: DuckdbInstanceHandle): void {
  handle.refs--
  if (handle.refs > 0) return
  if (!memoryHandles.has(handle)) return
  memoryHandles.delete(handle)
  handle.instance.closeSync()
}

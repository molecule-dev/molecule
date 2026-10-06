/**
 * Opens PGlite instances and shares one instance per persistent data directory.
 *
 * @module
 */

import { PGlite, type PGliteOptions, types } from '@electric-sql/pglite'

import { ConnectionLock } from './queue.js'
import type { PgliteConfig } from './types.js'

/** The in-memory data directory. */
export const MEMORY_DATA_DIR = 'memory://'

/** Default on-disk data directory under a Node runtime. */
export const DEFAULT_NODE_DATA_DIR = './data/pglite'

/**
 * One opened database: the PGlite instance, the lock over its single
 * connection, and how many pools currently use it.
 */
export interface PgliteInstance {
  /** The PGlite instance. */
  db: PGlite
  /** FIFO lock over the instance's one connection. */
  lock: ConnectionLock
  /** The resolved data directory (absolute path for Node filesystem paths). */
  dataDir: string
  /** Pools currently using this instance. */
  refs: number
  /** Registry key for shared (persistent) instances; `null` for in-memory ones. */
  key: string | null
}

/**
 * Open persistent instances, keyed by resolved data directory. Two PGlite
 * instances on the SAME directory both open without complaint and then write
 * over each other's files (verified against PGlite 0.5.8), so every pool on one
 * directory in this process shares one instance and one lock.
 */
const shared = new Map<string, Promise<PgliteInstance>>()

/** Persistent instances still closing, so a reopen waits for the files to be released. */
const closing = new Map<string, Promise<void>>()

/**
 * Whether a Node runtime is present (also true in Node-compatible in-browser
 * runtimes such as WebContainers).
 *
 * @returns `true` under Node.
 */
function hasNodeRuntime(): boolean {
  const g = globalThis as { process?: { versions?: { node?: string } } }
  return Boolean(g.process?.versions?.node)
}

/**
 * Picks the data directory from config, then `PGLITE_DATA_DIR`, then the
 * runtime default.
 *
 * @param config - Pool configuration.
 * @returns The data directory as given (not yet resolved to an absolute path).
 */
export function chooseDataDir(config?: PgliteConfig): string {
  if (config?.dataDir) return config.dataDir
  const g = globalThis as { process?: { env?: Record<string, string | undefined> } }
  const fromEnv = g.process?.env?.PGLITE_DATA_DIR
  if (fromEnv) return fromEnv
  return hasNodeRuntime() ? DEFAULT_NODE_DATA_DIR : MEMORY_DATA_DIR
}

/**
 * Whether a data directory is a plain filesystem path (no `scheme://`).
 *
 * @param dataDir - The data directory.
 * @returns `true` for a filesystem path.
 */
function isFilesystemPath(dataDir: string): boolean {
  return !/^[a-z][a-z0-9+.-]*:\/\//i.test(dataDir)
}

/**
 * Builds the PGlite constructor options for a pool.
 *
 * @param dataDir - The resolved data directory.
 * @param config - Pool configuration.
 * @returns Options for `new PGlite()`.
 */
function pgliteOptionsFor(dataDir: string, config?: PgliteConfig): PGliteOptions {
  const int8AsString = config?.int8AsString ?? true
  const extra = config?.pgliteOptions ?? {}
  const parsers: NonNullable<PGliteOptions['parsers']> = {}
  if (int8AsString) parsers[types.INT8] = (value: string) => value
  Object.assign(parsers, extra.parsers)
  return {
    ...extra,
    parsers,
    ...(dataDir === MEMORY_DATA_DIR ? {} : { dataDir }),
  }
}

/**
 * Opens a PGlite instance and waits until it is ready.
 *
 * @param dataDir - The resolved data directory.
 * @param key - Registry key, or `null` for an unshared instance.
 * @param config - Pool configuration.
 * @returns The ready instance with one reference taken.
 */
async function open(
  dataDir: string,
  key: string | null,
  config?: PgliteConfig,
): Promise<PgliteInstance> {
  const db = new PGlite(pgliteOptionsFor(dataDir, config))
  await db.waitReady
  return { db, lock: new ConnectionLock(), dataDir, refs: 1, key }
}

/**
 * Opens (or joins) the instance for a pool. In-memory pools always get their
 * own instance; pools on the same persistent directory share one.
 *
 * @param config - Pool configuration.
 * @returns The instance, with a reference taken for the caller.
 */
export async function acquireInstance(config?: PgliteConfig): Promise<PgliteInstance> {
  let dataDir = chooseDataDir(config)
  if (dataDir === MEMORY_DATA_DIR) return open(dataDir, null, config)

  if (isFilesystemPath(dataDir)) {
    if (!hasNodeRuntime()) {
      throw new Error(
        `PGlite: dataDir "${dataDir}" is a filesystem path, which needs a Node runtime. ` +
          `In a browser use "idb://<name>" (IndexedDB) or "memory://".`,
      )
    }
    const { resolve, dirname } = await import('node:path')
    dataDir = resolve(dataDir)
    // PGlite creates the data directory itself but not its parents (it fails
    // with ENOENT on mkdir otherwise).
    const { mkdir } = await import('node:fs/promises')
    await mkdir(dirname(dataDir), { recursive: true })
  }

  const key = dataDir
  // Let a close of the same directory finish before opening it again.
  while (closing.has(key) && !shared.has(key)) await closing.get(key)
  const existing = shared.get(key)
  if (existing) {
    const instance = await existing
    instance.refs++
    return instance
  }
  const opening = open(dataDir, key, config)
  shared.set(key, opening)
  try {
    return await opening
  } catch (error) {
    shared.delete(key)
    throw error
  }
}

/**
 * Drops a pool's reference; closes the instance when no pool uses it.
 *
 * @param instance - The instance to release.
 */
export async function releaseInstance(instance: PgliteInstance): Promise<void> {
  instance.refs--
  if (instance.refs > 0) return
  if (instance.db.closed) {
    if (instance.key !== null) shared.delete(instance.key)
    return
  }
  if (instance.key === null) {
    await instance.db.close()
    return
  }
  const key = instance.key
  shared.delete(key)
  const done = instance.db.close().finally(() => {
    if (closing.get(key) === done) closing.delete(key)
  })
  closing.set(key, done)
  await done
}

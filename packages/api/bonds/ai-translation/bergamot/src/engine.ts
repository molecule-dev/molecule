/**
 * The default Bergamot engine: worker threads, one small pool per language route.
 *
 * Each worker instantiates the WASM runtime once and loads exactly one route —
 * one model, or the two models of a pivot through English — the way Firefox
 * runs one engine per language pair (a runtime that switched models crashed;
 * see `worker.ts`). A batch is split across that route's workers, so
 * `workers: N` translates up to N chunks of one language pair at once. The
 * least recently used route is shut down when more than `maxLoadedRoutes` are
 * loaded. Idle workers are unref'd, so an idle engine never keeps the process
 * alive.
 *
 * @module
 */

import { Worker } from 'node:worker_threads'

import type { BergamotEngine, BergamotModelSpec, BergamotRequest } from './types.js'

/**
 * Options for {@link createWorkerEngine}.
 */
export interface WorkerEngineOptions {
  /** Resolves the runtime files, downloading them on first use. */
  runtime: () => Promise<{ wasmPath: string; gluePath: string }>
  /** Worker threads per route. */
  workers: number
  /** Routes (language pairs) kept loaded at once. */
  maxLoadedRoutes: number
}

/** One worker and the requests waiting on it. */
interface PoolWorker {
  worker: Worker
  pending: Map<number, { resolve: (texts: string[]) => void; reject: (error: Error) => void }>
}

/** The workers of one route. */
interface RoutePool {
  workers: PoolWorker[]
  models: BergamotModelSpec[]
}

/**
 * The worker script: `worker.ts` beside this file when running from source
 * (Node strips the types), `worker.js` from `dist/`.
 *
 * @returns The worker's URL.
 */
function workerUrl(): URL {
  return new URL(import.meta.url.endsWith('.ts') ? './worker.ts' : './worker.js', import.meta.url)
}

/**
 * Creates a worker-thread Bergamot engine.
 *
 * @param options - Runtime files, workers per route, routes kept loaded.
 * @returns The engine.
 */
export function createWorkerEngine(options: WorkerEngineOptions): BergamotEngine {
  const size = Math.max(1, Math.floor(options.workers))
  const maxRoutes = Math.max(1, Math.floor(options.maxLoadedRoutes))
  /** Routes by key, least recently used first. */
  const routes = new Map<string, RoutePool>()
  let nextId = 0
  let runtime: Promise<{ wasmPath: string; gluePath: string }> | null = null

  /**
   * Starts one worker for a route.
   *
   * @param pool - The route's pool.
   * @param files - Runtime files.
   * @returns The worker entry.
   */
  const spawn = (pool: RoutePool, files: { wasmPath: string; gluePath: string }): PoolWorker => {
    const entry: PoolWorker = {
      worker: new Worker(workerUrl(), { workerData: { ...files, models: pool.models } }),
      pending: new Map(),
    }
    entry.worker.unref()
    entry.worker.on('message', (message: { id: number; texts?: string[]; error?: string }) => {
      const waiter = entry.pending.get(message.id)
      if (!waiter) return
      entry.pending.delete(message.id)
      if (entry.pending.size === 0) entry.worker.unref()
      if (message.texts) waiter.resolve(message.texts)
      else waiter.reject(new Error(`Bergamot translation failed: ${message.error}`))
    })
    const fail = (error: Error): void => {
      // A dead worker fails its own requests and is replaced on the next call.
      const index = pool.workers.indexOf(entry)
      if (index !== -1) pool.workers.splice(index, 1)
      for (const waiter of entry.pending.values()) {
        waiter.reject(new Error('Bergamot worker stopped', { cause: error }))
      }
      entry.pending.clear()
    }
    entry.worker.on('error', fail)
    entry.worker.on('exit', (code) => {
      if (pool.workers.includes(entry)) fail(new Error(`Bergamot worker exited with code ${code}`))
    })
    return entry
  }

  /**
   * Returns the route's pool, filled to `workers`, evicting the least recently used route.
   *
   * @param models - The route.
   * @returns Its pool.
   */
  const poolFor = async (models: BergamotModelSpec[]): Promise<RoutePool> => {
    runtime ??= options.runtime().catch((error: unknown) => {
      runtime = null // let the next call retry the download
      throw error
    })
    const files = await runtime
    const key = models.map((model) => model.key).join('>')
    const pool = routes.get(key) ?? { workers: [], models }
    routes.delete(key)
    routes.set(key, pool)
    while (pool.workers.length < size) pool.workers.push(spawn(pool, files))
    for (const [oldKey, old] of routes) {
      if (routes.size <= maxRoutes) break
      if (old === pool || old.workers.some((w) => w.pending.size > 0)) continue
      routes.delete(oldKey)
      void Promise.all(old.workers.map(({ worker }) => worker.terminate()))
    }
    return pool
  }

  /**
   * Sends one chunk to the route's least busy worker.
   *
   * @param pool - The route's pool.
   * @param texts - The chunk.
   * @param html - HTML mode.
   * @returns Its translations.
   */
  const send = (pool: RoutePool, texts: string[], html: boolean): Promise<string[]> => {
    const entry = pool.workers.reduce((a, b) => (b.pending.size < a.pending.size ? b : a))
    const id = nextId++
    return new Promise<string[]>((resolve, reject) => {
      entry.pending.set(id, { resolve, reject })
      entry.worker.ref()
      entry.worker.postMessage({ id, texts, html })
    })
  }

  return {
    async translate(request: BergamotRequest): Promise<string[]> {
      if (request.texts.length === 0) return []
      const pool = await poolFor(request.models)
      const chunkSize = Math.ceil(request.texts.length / pool.workers.length)
      const chunks: Array<Promise<string[]>> = []
      for (let i = 0; i < request.texts.length; i += chunkSize) {
        chunks.push(send(pool, request.texts.slice(i, i + chunkSize), request.html))
      }
      return (await Promise.all(chunks)).flat()
    },
    async close(): Promise<void> {
      const pools = [...routes.values()]
      routes.clear()
      await Promise.all(
        pools.flatMap(({ workers }) => workers.splice(0).map(({ worker }) => worker.terminate())),
      )
    },
  }
}

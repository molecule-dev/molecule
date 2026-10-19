/**
 * A lazy Node worker owns the model; callers receive ordered vectors or errors.
 * Standard worker_threads provides CPU isolation without another queue service.
 * One worker per provider, bounded request lifetime, unref while idle, explicit
 * close on shutdown. A dead/timed-out worker is replaced only after it exits.
 * @module
 */
import { Worker } from 'node:worker_threads'

import type { LocalEmbeddingsConfig, LocalEmbeddingsPooling } from './types.js'

/** Internal configuration resolved before crossing the worker boundary. */
export interface ResolvedLocalEmbeddingsConfig extends LocalEmbeddingsConfig {
  model: string
  pooling: LocalEmbeddingsPooling
  normalize: boolean
  batchSize: number
  inferenceThreads: number
  requestTimeoutMs: number
}

interface Pending {
  resolve: (vectors: number[][]) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

/** Internal transport; factory injection lets tests exercise real worker failures. */
export function createWorkerExtractor(
  config: ResolvedLocalEmbeddingsConfig,
  spawn: () => Worker = () =>
    new Worker(
      new URL(import.meta.url.endsWith('.ts') ? './worker.ts' : './worker.js', import.meta.url),
      {
        workerData: config,
        // A caller launched from stdin/eval may have --input-type=module;
        // Node rejects that flag for the worker's real file entry point.
        execArgv: process.execArgv.filter(
          (arg, index, args) =>
            arg !== '--input-type' &&
            !arg.startsWith('--input-type=') &&
            args[index - 1] !== '--input-type',
        ),
      },
    ),
): { extract(texts: string[]): Promise<number[][]>; close(): Promise<void> } {
  let current: { worker: Worker; pending: Map<number, Pending>; failed: boolean } | null = null
  let stopping = Promise.resolve()
  let closed = false
  let nextId = 0

  const start = (): NonNullable<typeof current> => {
    const entry = { worker: spawn(), pending: new Map<number, Pending>(), failed: false }
    entry.worker.on('message', (message: { id: number; vectors?: number[][]; error?: string }) => {
      const pending = entry.pending.get(message.id)
      if (!pending) return
      clearTimeout(pending.timer)
      entry.pending.delete(message.id)
      if (entry.pending.size === 0) entry.worker.unref()
      if (Array.isArray(message.vectors)) pending.resolve(message.vectors)
      else pending.reject(new Error(message.error ?? 'Embeddings worker returned no vectors'))
    })
    entry.worker.on('error', (error) =>
      fail(entry, error instanceof Error ? error : new Error(String(error))),
    )
    entry.worker.on('exit', (code) => fail(entry, new Error(`Embeddings worker exited (${code})`)))
    entry.worker.unref()
    return entry
  }

  const fail = (entry: NonNullable<typeof current>, error: Error): void => {
    if (entry.failed) return
    entry.failed = true
    if (current === entry) current = null
    for (const pending of entry.pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(error)
    }
    entry.pending.clear()
    stopping = entry.worker.terminate().then(() => undefined)
  }

  return {
    async extract(texts) {
      if (closed) throw new Error('Local embeddings provider is closed')
      await stopping
      if (closed) throw new Error('Local embeddings provider is closed')
      current ??= start()
      const entry = current
      const id = nextId++
      return new Promise<number[][]>((resolve, reject) => {
        const timer = setTimeout(
          () =>
            fail(
              entry,
              new Error(`Local embeddings request timed out after ${config.requestTimeoutMs}ms`),
            ),
          config.requestTimeoutMs,
        )
        entry.pending.set(id, { resolve, reject, timer })
        entry.worker.ref()
        try {
          entry.worker.postMessage({ id, texts })
        } catch (error) {
          fail(entry, error instanceof Error ? error : new Error(String(error)))
        }
      })
    },
    async close() {
      closed = true
      if (current) fail(current, new Error('Local embeddings provider is closed'))
      await stopping
    },
  }
}

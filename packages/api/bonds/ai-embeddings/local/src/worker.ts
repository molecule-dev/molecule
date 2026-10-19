/**
 * One model and one inference operation at a time, outside the HTTP event loop.
 * Serializing the requests also bounds activations when several indexes warm
 * together. A failed initialization is retried on the next request.
 * @module
 */
import { parentPort, workerData } from 'node:worker_threads'

import type { Extractor } from './extractor.js'
import type { ResolvedLocalEmbeddingsConfig } from './worker-client.js'

const config = workerData as ResolvedLocalEmbeddingsConfig
let extractor: Promise<Extractor> | null = null
let queue = Promise.resolve()

parentPort?.on('message', (message: { id: number; texts: string[] }) => {
  queue = queue.then(async () => {
    try {
      extractor ??= import(import.meta.url.endsWith('.ts') ? './extractor.ts' : './extractor.js')
        .then(({ createExtractor }) => createExtractor(config))
        .catch((error: unknown) => {
          extractor = null
          throw error
        })
      const vectors = await (await extractor)(message.texts)
      parentPort?.postMessage({ id: message.id, vectors })
    } catch (error) {
      parentPort?.postMessage({
        id: message.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })
})

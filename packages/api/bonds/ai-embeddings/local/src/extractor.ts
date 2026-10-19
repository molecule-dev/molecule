/**
 * Model loading and inference, executed only in the embeddings worker.
 * Node worker_threads keeps synchronous tokenizer/model work off the caller's
 * event loop; ONNX's own thread count is bounded separately.
 * @module
 */
import type { ResolvedLocalEmbeddingsConfig } from './worker-client.js'

/** Texts to vectors in input order. */
export type Extractor = (texts: string[]) => Promise<number[][]>

/** Load one model and return a memory-bounded extractor. */
export async function createExtractor(config: ResolvedLocalEmbeddingsConfig): Promise<Extractor> {
  const { pipeline, env } = await import('@huggingface/transformers')
  if (config.localModelPath) {
    env.localModelPath = config.localModelPath
    env.allowRemoteModels = config.allowRemoteModels ?? false
  } else if (config.allowRemoteModels !== undefined) {
    env.allowRemoteModels = config.allowRemoteModels
  }
  if (config.cacheDir) env.cacheDir = config.cacheDir
  const pipe = await pipeline('feature-extraction', config.model, {
    session_options: { intraOpNumThreads: config.inferenceThreads, interOpNumThreads: 1 },
  })
  return async (texts) => {
    const vectors: number[][] = []
    for (let start = 0; start < texts.length; start += config.batchSize) {
      const tensor = (await pipe(texts.slice(start, start + config.batchSize), {
        pooling: config.pooling,
        normalize: config.normalize,
      })) as unknown as { tolist(): number[][] }
      for (const vector of tensor.tolist()) vectors.push(vector)
    }
    return vectors
  }
}

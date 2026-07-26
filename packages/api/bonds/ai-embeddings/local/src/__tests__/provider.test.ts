import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Transformers.js so tests never load the real ~90MB model / native addon.
// The provider dynamically `import('@huggingface/transformers')`, which this intercepts.
const pipelineMock = vi.fn()
const envMock: Record<string, unknown> = {}
vi.mock('@huggingface/transformers', () => ({
  pipeline: (...args: unknown[]) => pipelineMock(...args),
  env: envMock,
}))

import { createProvider } from '../provider.js'

/** A stub pipeline: returns a tensor whose tolist() gives one 384-dim vector per input text. */
function makePipe() {
  return vi.fn(async (texts: string[]) => ({
    tolist: () => texts.map((t) => [t.length, ...(Array(383).fill(0) as number[])]),
  }))
}

describe('api-ai-embeddings-local', () => {
  beforeEach(() => {
    pipelineMock.mockReset()
    for (const key of Object.keys(envMock)) delete envMock[key]
    delete process.env.MOL_EMBEDDINGS_LOCAL_MODEL
    delete process.env.MOL_EMBEDDINGS_LOCAL_MODEL_PATH
    delete process.env.MOL_EMBEDDINGS_LOCAL_CACHE_DIR
    delete process.env.MOL_EMBEDDINGS_LOCAL_BATCH_SIZE
  })

  it('embedDocuments returns one 384-length vector per text', async () => {
    const pipe = makePipe()
    pipelineMock.mockResolvedValue(pipe)
    const provider = createProvider()
    const vectors = await provider.embedDocuments(['a', 'bb', 'ccc'])
    expect(vectors).toHaveLength(3)
    expect(vectors[0]).toHaveLength(384)
    expect(pipe).toHaveBeenCalledWith(['a', 'bb', 'ccc'], { pooling: 'cls', normalize: true })
  })

  it('embedQuery returns the single vector for the text', async () => {
    pipelineMock.mockResolvedValue(makePipe())
    const vector = await createProvider().embedQuery('hello')
    expect(vector).toHaveLength(384)
    expect(vector[0]).toBe('hello'.length)
  })

  it('embed wraps a single string input and reports zero usage', async () => {
    pipelineMock.mockResolvedValue(makePipe())
    const result = await createProvider().embed({ input: 'one' })
    expect(result.embeddings).toHaveLength(1)
    expect(result.usage).toEqual({ promptTokens: 0, totalTokens: 0 })
    expect(result.model).toBe('Xenova/bge-small-en-v1.5')
  })

  it('embed short-circuits empty input without loading the model', async () => {
    const provider = createProvider()
    const result = await provider.embed({ input: [] })
    expect(result.embeddings).toEqual([])
    expect(pipelineMock).not.toHaveBeenCalled()
  })

  it('defaults to the bge-small model and honors a model override', async () => {
    pipelineMock.mockResolvedValue(makePipe())
    await createProvider().embedQuery('x')
    expect(pipelineMock).toHaveBeenCalledWith('feature-extraction', 'Xenova/bge-small-en-v1.5')

    pipelineMock.mockClear()
    await createProvider({ model: 'Xenova/all-MiniLM-L6-v2' }).embedQuery('x')
    expect(pipelineMock).toHaveBeenCalledWith('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  })

  it('forwards custom pooling + normalize to the pipeline call', async () => {
    const pipe = makePipe()
    pipelineMock.mockResolvedValue(pipe)
    await createProvider({ pooling: 'mean', normalize: false }).embedDocuments(['x'])
    expect(pipe).toHaveBeenCalledWith(['x'], { pooling: 'mean', normalize: false })
  })

  it('loads the model once across multiple calls (single-flight)', async () => {
    pipelineMock.mockResolvedValue(makePipe())
    const provider = createProvider()
    await provider.embedQuery('a')
    await provider.embedDocuments(['b', 'c'])
    await provider.embed({ input: 'd' })
    expect(pipelineMock).toHaveBeenCalledTimes(1)
  })

  it('a bundled localModelPath disables remote model fetch', async () => {
    pipelineMock.mockResolvedValue(makePipe())
    await createProvider({ localModelPath: '/models' }).embedQuery('x')
    expect(envMock.localModelPath).toBe('/models')
    expect(envMock.allowRemoteModels).toBe(false)
  })

  it('splits a large corpus into bounded forward passes, preserving order', async () => {
    // The whole point: inference is in-process, so an unbatched call holds every
    // input's activations at once. Indexing ~900 documents in one pass peaked at
    // ~3.8 GiB and was OOM-killed under a 1-2 GiB container limit — and a kernel
    // kill bypasses every `catch`, so the caller's graceful degradation never ran.
    const pipe = makePipe()
    pipelineMock.mockResolvedValue(pipe)
    const texts = Array.from({ length: 100 }, (_, i) => 'x'.repeat(i + 1))

    const vectors = await createProvider({ batchSize: 32 }).embedDocuments(texts)

    expect(pipe).toHaveBeenCalledTimes(4) // 32 + 32 + 32 + 4
    expect(pipe.mock.calls.map(([batch]) => batch.length)).toEqual([32, 32, 32, 4])
    // Order must survive the split — a vector is only meaningful paired with the
    // document at the same index.
    expect(vectors).toHaveLength(100)
    expect(vectors.map((v) => v[0])).toEqual(texts.map((t) => t.length))
  })

  it('defaults to a bounded batch even when the caller passes everything at once', async () => {
    const pipe = makePipe()
    pipelineMock.mockResolvedValue(pipe)
    await createProvider().embedDocuments(Array.from({ length: 70 }, (_, i) => `t${i}`))
    expect(pipe.mock.calls.map(([batch]) => batch.length)).toEqual([32, 32, 6])
  })

  it('bounds every embedding path, not just embedDocuments', async () => {
    const pipe = makePipe()
    pipelineMock.mockResolvedValue(pipe)
    await createProvider({ batchSize: 2 }).embed({ input: ['a', 'b', 'c'] })
    expect(pipe.mock.calls.map(([batch]) => batch.length)).toEqual([2, 1])
  })

  it('reads the batch size from the environment', async () => {
    const pipe = makePipe()
    pipelineMock.mockResolvedValue(pipe)
    process.env.MOL_EMBEDDINGS_LOCAL_BATCH_SIZE = '3'
    await createProvider().embedDocuments(['a', 'b', 'c', 'd'])
    expect(pipe.mock.calls.map(([batch]) => batch.length)).toEqual([3, 1])
  })

  it('a malformed or zero batch size falls back rather than removing the bound', async () => {
    // A typo'd env var must not silently restore the unbatched behaviour, and 0
    // would loop forever without ever embedding anything.
    const pipe = makePipe()
    pipelineMock.mockResolvedValue(pipe)
    process.env.MOL_EMBEDDINGS_LOCAL_BATCH_SIZE = 'lots'
    await createProvider().embedDocuments(Array.from({ length: 40 }, (_, i) => `t${i}`))
    expect(pipe.mock.calls.map(([batch]) => batch.length)).toEqual([32, 8])

    // batchSize 0 falls back to the default, so these two texts go in ONE pass
    // and the loop terminates — rather than advancing by 0 forever.
    pipe.mockClear()
    const vectors = await createProvider({ batchSize: 0 }).embedDocuments(['a', 'b'])
    expect(pipe.mock.calls.map(([batch]) => batch.length)).toEqual([2])
    expect(vectors).toHaveLength(2)
  })

  it('retries initialization after a transient load failure', async () => {
    pipelineMock.mockRejectedValueOnce(new Error('network blip')).mockResolvedValue(makePipe())
    const provider = createProvider()
    await expect(provider.embedQuery('x')).rejects.toThrow('network blip')
    // Second call re-attempts (the failed promise was cleared) and succeeds.
    const vector = await provider.embedQuery('x')
    expect(vector).toHaveLength(384)
    expect(pipelineMock).toHaveBeenCalledTimes(2)
  })
})

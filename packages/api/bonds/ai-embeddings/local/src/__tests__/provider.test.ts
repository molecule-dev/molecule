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

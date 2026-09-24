/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real embeddings core.
 * Only the native model runtime is mocked: `@huggingface/transformers` returns
 * a stub feature-extraction pipeline (as the package's own tests do), so no
 * model is downloaded or loaded.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

const pipelineMock = vi.fn()

vi.mock('@huggingface/transformers', () => ({
  pipeline: (...args: unknown[]) => pipelineMock(...args),
  env: {},
}))

import { requireProvider, setProvider } from '@molecule/api-ai-embeddings'

import { createProvider } from '../index.js'

/**
 * A deterministic unit vector per text: password-related texts point one way,
 * everything else another.
 *
 * @param text - The input text.
 * @returns A 384-dim, L2-normalized vector.
 */
function fakeVector(text: string): number[] {
  const vector = new Array<number>(384).fill(0)
  vector[/password/i.test(text) ? 0 : 1] = 1
  return vector
}

describe('README @example', () => {
  it('bonds the local provider and ranks documents by cosine similarity', async () => {
    const pipe = vi.fn(async (texts: string[]) => ({ tolist: () => texts.map(fakeVector) }))
    pipelineMock.mockResolvedValue(pipe)

    setProvider(createProvider({ model: 'Xenova/bge-small-en-v1.5' }))

    const docs = ['How do I reset my password?', 'Billing and invoices']
    const docVectors = await requireProvider().embedDocuments(docs)
    const query = await requireProvider().embedQuery('forgot my password')

    const dot = (a: number[], b: number[]): number =>
      a.reduce((sum, x, i) => sum + x * (b[i] ?? 0), 0)
    const scores = docVectors.map((vector) => dot(vector, query))

    expect(docVectors).toHaveLength(2)
    expect(docVectors[0]).toHaveLength(384)
    expect(docs[scores.indexOf(Math.max(...scores))]).toBe('How do I reset my password?')
    expect(pipelineMock).toHaveBeenCalledTimes(1)
    expect(pipelineMock).toHaveBeenCalledWith('feature-extraction', 'Xenova/bge-small-en-v1.5')
    expect(pipe).toHaveBeenCalledWith(docs, { pooling: 'cls', normalize: true })
  })
})

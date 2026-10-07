/**
 * LIVE parity check against the Python reference.
 *
 * Downloads the real ONNX weights (~314 MB at q8) and compares this bond's
 * vectors with vectors produced by the reference implementation,
 * `SentenceTransformer("google/embeddinggemma-2").encode(texts,
 * normalize_embeddings=True)` (sentence-transformers 6.1.0, transformers 5.19.0,
 * torch 2.14.1 CPU), stored in `fixtures/python-reference.json`.
 *
 * Opt in with `MOL_EMBEDDINGGEMMA_LIVE=1`; CI/default runs skip it entirely
 * (`describe.runIf`), because it needs the network and ~1 GB of RAM.
 *
 * @module
 */

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { createProvider } from '../provider.js'

const LIVE = process.env.MOL_EMBEDDINGGEMMA_LIVE === '1'

/** The stored Python reference: already-prefixed texts and their 768-d vectors. */
const reference = JSON.parse(
  readFileSync(new URL('./fixtures/python-reference.json', import.meta.url), 'utf8'),
) as { texts: string[]; vectors: number[][] }

/**
 * Cosine similarity.
 *
 * @param a - First vector.
 * @param b - Second vector.
 * @returns The cosine.
 */
function cosine(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0)
    normA += (a[i] ?? 0) ** 2
    normB += (b[i] ?? 0) ** 2
  }
  return dot / Math.sqrt(normA * normB)
}

describe.runIf(LIVE)('@molecule/api-ai-embeddings-embeddinggemma — LIVE parity', () => {
  it('q8 matches the Python sentence-transformers reference (cosine ≥ 0.999)', async () => {
    const provider = createProvider({ dtype: 'q8' })
    // The fixture texts carry their prefixes already; the bond must not add another.
    const { embeddings } = await provider.embed({ input: reference.texts })
    embeddings.forEach((vector, i) => {
      expect(vector).toHaveLength(768)
      expect(cosine(vector, reference.vectors[i] ?? [])).toBeGreaterThanOrEqual(0.999)
    })
    // The bond's own prefixing reproduces the reference query exactly.
    const query = await provider.embedQuery('Which planet is known as the Red Planet?')
    expect(cosine(query, reference.vectors[0] ?? [])).toBeGreaterThanOrEqual(0.999)
  }, 300_000)

  it('q4 stays within the quality the ONNX card reports (cosine ≥ 0.98)', async () => {
    const { embeddings } = await createProvider({ dtype: 'q4' }).embed({ input: reference.texts })
    embeddings.forEach((vector, i) => {
      expect(cosine(vector, reference.vectors[i] ?? [])).toBeGreaterThanOrEqual(0.98)
    })
  }, 300_000)
})

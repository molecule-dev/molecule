/**
 * Matryoshka (MRL) truncation for EmbeddingGemma 2 vectors.
 *
 * The model was trained so the first 512 / 256 / 128 values of its 768-d output
 * are usable embeddings on their own — after re-normalizing, since the prefix of
 * a unit vector is shorter than 1.
 *
 * @module
 */

/** Output sizes the model was trained for. */
export const MATRYOSHKA_DIMENSIONS: readonly number[] = [768, 512, 256, 128]

/**
 * Truncate a vector to its first `dimensions` values and re-L2-normalize it
 * (Matryoshka). A full-size vector is returned unchanged.
 *
 * @param vector - A unit-length embedding.
 * @param dimensions - Target size.
 * @returns The truncated, unit-length vector.
 */
export function truncateEmbedding(vector: number[], dimensions: number): number[] {
  if (vector.length <= dimensions) return vector
  const head = vector.slice(0, dimensions)
  const norm = Math.hypot(...head)
  return norm > 0 ? head.map((value) => value / norm) : head
}

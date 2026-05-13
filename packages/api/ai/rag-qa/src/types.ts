/** A chunk of source material to be embedded + indexed. */
export interface Chunk {
  id: string
  text: string
  metadata?: Record<string, unknown>
}

/** A retrieval hit from the vector store. */
export interface RetrievalHit {
  id: string
  text: string
  score: number
  metadata?: Record<string, unknown>
}

/** Final grounded answer + the sources it cited. */
export interface GroundedAnswer {
  answer: string
  sources: RetrievalHit[]
  /** Token / chunk count used for the prompt (for cost telemetry). */
  contextTokens?: number
}

/** Chunking options for `chunkText`. */
export interface ChunkOptions {
  /** Max characters per chunk. Default 1000. */
  maxChars?: number
  /** Overlap characters between adjacent chunks. Default 200. */
  overlap?: number
  /** Prefer chunking at paragraph boundaries when possible. Default true. */
  preferParagraphs?: boolean
}

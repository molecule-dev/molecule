import type { ChunkOptions } from './types.js'

/**
 * Split a long text into overlapping chunks suitable for embedding.
 *
 * Tries paragraph boundaries first, then sentence boundaries, then
 * character boundaries. Each chunk includes `overlap` characters from
 * the prior chunk to preserve context across boundaries.
 */
export function chunkText(text: string, opts: ChunkOptions = {}): string[] {
  const maxChars = opts.maxChars ?? 1000
  const overlap = opts.overlap ?? 200
  const preferParagraphs = opts.preferParagraphs !== false
  if (text.length <= maxChars) return [text]

  const out: string[] = []
  let cursor = 0
  while (cursor < text.length) {
    let end = Math.min(cursor + maxChars, text.length)
    if (end < text.length) {
      // Try to break at paragraph
      const paraEnd = preferParagraphs ? text.lastIndexOf('\n\n', end) : -1
      const sentenceEnd = Math.max(
        text.lastIndexOf('. ', end),
        text.lastIndexOf('! ', end),
        text.lastIndexOf('? ', end),
      )
      if (paraEnd > cursor + maxChars / 2) end = paraEnd
      else if (sentenceEnd > cursor + maxChars / 2) end = sentenceEnd + 1
    }
    out.push(text.slice(cursor, end).trim())
    if (end >= text.length) break
    cursor = Math.max(end - overlap, cursor + 1)
  }
  return out.filter((c) => c.length > 0)
}

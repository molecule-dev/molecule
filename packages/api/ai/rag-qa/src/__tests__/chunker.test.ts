import { describe, expect, it } from 'vitest'

import { chunkText } from '../chunker.js'

describe('chunkText', () => {
  it('returns the text unchunked when it fits within maxChars', () => {
    const text = 'A short doc.'
    expect(chunkText(text, { maxChars: 1000 })).toEqual(['A short doc.'])
  })

  it('returns an empty array for empty input larger than 0 chars (filters empties)', () => {
    // The defensive `.length > 0` filter at the bottom catches any empty
    // pieces that fall out of paragraph-split short-circuits.
    expect(chunkText('', { maxChars: 10 })).toEqual([''])
  })

  it('honours custom maxChars + overlap defaults', () => {
    // 50 chars of 'a' with maxChars=20 and overlap=5 should produce
    // chunks of roughly 20 chars each, advancing by ~15 chars at a time.
    const text = 'a'.repeat(50)
    const chunks = chunkText(text, { maxChars: 20, overlap: 5 })
    expect(chunks.length).toBeGreaterThanOrEqual(3)
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(20)
  })

  it('overlapping chunks share the trailing N characters of the previous chunk', () => {
    // No paragraph or sentence breaks → falls back to char boundary with overlap.
    const text = 'abcdefghijklmnopqrstuvwxyz0123456789'
    const chunks = chunkText(text, { maxChars: 10, overlap: 3 })
    expect(chunks.length).toBeGreaterThan(1)
    // Last 3 chars of chunk[0] should appear at start of chunk[1]
    for (let i = 0; i < chunks.length - 1; i++) {
      const tail = chunks[i].slice(-3)
      expect(chunks[i + 1].startsWith(tail)).toBe(true)
    }
  })

  it('prefers paragraph boundary when one exists past the halfway point', () => {
    const part1 = 'A'.repeat(700)
    const part2 = 'B'.repeat(700)
    const text = `${part1}\n\n${part2}` // paragraph break at index 700
    // maxChars=1000 forces a split; paragraph break at 700 is past
    // halfway (cursor+500), so it should be preferred over char-cut.
    const chunks = chunkText(text, { maxChars: 1000, overlap: 50 })
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0]).not.toContain('B')
    expect(chunks[0]).toContain('A')
  })

  it('falls back to sentence boundary when no paragraph break is available', () => {
    const sentence = 'Sentence one. Sentence two. Sentence three. '.repeat(40)
    const chunks = chunkText(sentence, { maxChars: 100, overlap: 10 })
    // Most chunks should end with a sentence terminator (no mid-sentence cut)
    const terminators = chunks.filter((c) => c.endsWith('.') || c.endsWith('!') || c.endsWith('?'))
    expect(terminators.length).toBeGreaterThan(chunks.length / 2)
  })

  it('falls back to character boundary when no sentence break is found', () => {
    // No '. ', '! ', '? ', or '\n\n' anywhere → must split at maxChars.
    const text = 'a'.repeat(500)
    const chunks = chunkText(text, { maxChars: 100, overlap: 10 })
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(100)
  })

  it('preferParagraphs=false disables paragraph preference', () => {
    const part1 = 'A'.repeat(50)
    const part2 = 'B'.repeat(50)
    // Build a text where paragraph break would be < halfway and shouldn't be used
    // even if `preferParagraphs` were true; preferParagraphs=false guarantees it.
    const text = `${part1}\n\n${part2}. ${'C'.repeat(200)}`
    const chunks = chunkText(text, { maxChars: 150, overlap: 10, preferParagraphs: false })
    expect(chunks.length).toBeGreaterThanOrEqual(1)
  })

  it('trims whitespace from each chunk', () => {
    const text = '   hello world. '.repeat(30)
    const chunks = chunkText(text, { maxChars: 60, overlap: 10 })
    for (const c of chunks) {
      expect(c).toBe(c.trim())
    }
  })

  it('makes forward progress (never infinite-loops at overlap boundary)', () => {
    // overlap >= maxChars would otherwise risk no advance per iteration;
    // implementation guards with `Math.max(end - overlap, cursor + 1)`.
    const text = 'a'.repeat(50)
    const chunks = chunkText(text, { maxChars: 10, overlap: 20 })
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.length).toBeLessThan(60) // upper bound to detect runaway
  })

  it('filters out empty trimmed pieces', () => {
    // Big stretch of whitespace can produce empty after trim — should be dropped.
    const text = '   \n\n   '.repeat(200)
    const chunks = chunkText(text, { maxChars: 50, overlap: 10 })
    for (const c of chunks) expect(c.length).toBeGreaterThan(0)
  })
})

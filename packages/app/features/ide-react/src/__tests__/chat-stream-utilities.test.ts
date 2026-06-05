/**
 * Tests for the streaming token estimate.
 *
 * estimateStreamTokens runs on every ~50ms stream flush. The bug it now guards
 * against: it used to JSON.stringify EVERY tool call's input (a write_file input
 * is the whole file) on every flush — O(total content) per flush, O(n²) across a
 * build, which froze the IDE. toolInputChars now caches each completed input's
 * length by object identity, so repeat calls are O(1).
 */

import { describe, expect, it } from 'vitest'

import { estimateStreamTokens, toolInputChars } from '../components/chat-stream-utilities.js'

describe('toolInputChars', () => {
  it('counts streamed bytes while the input is still arriving', () => {
    expect(toolInputChars({ streamInputChars: 120 })).toBe(120)
    expect(toolInputChars({})).toBe(0)
  })

  it('returns the serialized length of a completed input', () => {
    const input = { path: 'a.ts', content: 'hello' }
    expect(toolInputChars({ input })).toBe(JSON.stringify(input).length)
  })

  it('caches by object identity (does not re-serialize the same input)', () => {
    const input: { path: string; content: string } = { path: 'a.ts', content: 'x'.repeat(400) }
    const first = toolInputChars({ input })
    // Mutating the same object after the first call must NOT change the result —
    // proving the length was cached, not recomputed (the per-flush O(1) guarantee).
    input.content = 'y'.repeat(9000)
    expect(toolInputChars({ input })).toBe(first)
  })
})

describe('estimateStreamTokens', () => {
  it('estimates ~4 chars/token from text + thinking + tool inputs', () => {
    const msg = {
      content: 'a'.repeat(40), // 40 chars
      blocks: [
        { type: 'thinking', content: 'b'.repeat(40) }, // counts (40)
        { type: 'text', content: 'c'.repeat(1000) }, // text blocks NOT counted here
      ],
      toolCalls: [{ input: { path: 'x.ts', content: 'd'.repeat(16) } }],
    }
    const toolChars = JSON.stringify(msg.toolCalls[0].input).length
    expect(estimateStreamTokens(msg)).toBe(Math.round((40 + 40 + toolChars) / 4))
  })

  it('handles an empty message', () => {
    expect(estimateStreamTokens({})).toBe(0)
  })

  it('counts an in-flight tool call by streamed bytes', () => {
    expect(estimateStreamTokens({ toolCalls: [{ streamInputChars: 400 }] })).toBe(100)
  })
})

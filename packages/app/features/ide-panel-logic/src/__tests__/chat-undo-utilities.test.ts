/**
 * Tests for the chat undo helpers: the initial undone set read from persisted
 * flags, and the last-turn file-change collection `/undo` reverts.
 */

import { describe, expect, it } from 'vitest'

import type { ChatMessage, ToolCall } from '@molecule/app-ai-chat'

import { collectUndoTargets, initialUndoneToolCallIds } from '../components/chat-undo-utilities.js'

/** An assistant message with the given tool calls. */
function assistant(toolCalls: ToolCall[]): ChatMessage {
  return {
    id: `a-${toolCalls[0]?.id ?? 'x'}`,
    role: 'assistant',
    content: '',
    timestamp: 0,
    toolCalls,
  }
}

/** A file-changing tool call with a diff snapshot. */
function writeFile(
  id: string,
  path: string,
  original: string,
  extra: { isUndone?: boolean } = {},
): ToolCall {
  return {
    id,
    name: 'write_file',
    input: { path },
    fileDiff: { original, modified: 'changed' },
    status: 'done',
    ...extra,
  }
}

describe('initialUndoneToolCallIds', () => {
  it('collects every persisted isUndone id, across messages', () => {
    const messages: ChatMessage[] = [
      assistant([writeFile('t1', 'a.ts', 'a', { isUndone: true }), writeFile('t2', 'b.ts', 'b')]),
      { id: 'u1', role: 'user', content: 'hi', timestamp: 1 },
      assistant([{ id: 't3', name: 'read_file', input: {}, status: 'done', isUndone: true }]),
    ]
    expect([...initialUndoneToolCallIds(messages)]).toEqual(['t1', 't3'])
  })

  it('returns an empty set for no messages, or messages with no undo flags', () => {
    expect(initialUndoneToolCallIds([]).size).toBe(0)
    expect(initialUndoneToolCallIds([assistant([writeFile('t1', 'a.ts', 'a')])]).size).toBe(0)
    const userMessage: ChatMessage = { id: 'u', role: 'user', content: 'x', timestamp: 0 }
    expect(initialUndoneToolCallIds([userMessage]).size).toBe(0)
  })
})

describe('collectUndoTargets', () => {
  it('returns no targets when there is nothing to undo', () => {
    const targets = collectUndoTargets([], new Set())
    expect(targets.fileOriginals.size).toBe(0)
    expect(targets.tcIdsToUndo).toEqual([])
  })

  it('collects the last assistant turn with file changes, skipping already-undone calls', () => {
    const messages: ChatMessage[] = [
      assistant([writeFile('old', 'old.ts', 'old')]),
      assistant([
        writeFile('t1', 'a.ts', 'first'),
        writeFile('t2', 'a.ts', 'second'),
        writeFile('t3', 'b.ts', 'b', { isUndone: true }),
      ]),
    ]
    const targets = collectUndoTargets(messages, new Set(['t3']))
    // First write wins for a repeated path.
    expect([...targets.fileOriginals.entries()]).toEqual([['a.ts', 'first']])
    expect(targets.tcIdsToUndo).toEqual(['t1', 't2'])
  })

  it('skips non-file tools and file tools without a diff snapshot', () => {
    const messages: ChatMessage[] = [
      assistant([
        { id: 'r1', name: 'read_file', input: { path: 'x.ts' }, status: 'done' },
        { id: 'w1', name: 'write_file', input: { path: 'x.ts' }, status: 'done' },
        writeFile('e1', 'y.ts', 'y'),
      ]),
    ]
    const targets = collectUndoTargets(messages, new Set())
    expect([...targets.fileOriginals.entries()]).toEqual([['y.ts', 'y']])
    expect(targets.tcIdsToUndo).toEqual(['e1'])
  })

  it('still records a tool-call id when its input carries no path', () => {
    const messages: ChatMessage[] = [
      assistant([
        {
          id: 'w1',
          name: 'write_file',
          input: null,
          fileDiff: { original: 'o', modified: 'm' },
          status: 'done',
        },
      ]),
    ]
    const targets = collectUndoTargets(messages, new Set())
    expect(targets.fileOriginals.size).toBe(0)
    expect(targets.tcIdsToUndo).toEqual(['w1'])
  })

  it('only considers assistant turns', () => {
    const userTurn: ChatMessage = {
      id: 'u1',
      role: 'user',
      content: 'x',
      timestamp: 0,
      toolCalls: [writeFile('t1', 'a.ts', 'a')],
    }
    const targets = collectUndoTargets([userTurn], new Set())
    expect(targets.fileOriginals.size).toBe(0)
    expect(targets.tcIdsToUndo).toEqual([])
  })
})

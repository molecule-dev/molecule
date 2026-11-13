/**
 * Cases for the chat hooks and helpers (useChat, useChatProvider, convergeHistory, localOnlyMessages, resetChatStoresForTests).
 *
 * Streams are driven through the chat area's controls (`chat.emit` /
 * `chat.finish` / `chat.fail`, `chat.queue*`, `chat.side*`); see
 * `src/bindings/fakes/chat.ts`. Cases that stream set `fakeTimers`: the hook
 * flushes streamed deltas on a 50ms throttle and paces status labels with a
 * 650ms dwell, so a snapshot between an event and its flush is only
 * deterministic when the clock is fake. The chat fakes also pin `Date` at the
 * epoch and make `crypto.randomUUID()` a counter, so local message ids and
 * timestamps are identical in every framework.
 *
 * @module
 */

import type { ChatMessage } from '@molecule/app-ai-chat'

import type { ChatSeed } from '../fakes/chat.js'
import type { BindingContext, HookCases } from '../spec.js'

/** Chat options that do NOT load history on mount (isolates the send path). */
const noHistory = (extra: Record<string, unknown> = {}): unknown[] => [
  { endpoint: '/projects/p1/chat', projectId: 'p1', loadOnMount: false, ...extra },
]

/** Chat options that DO load history on mount (the default). */
const withHistory = (extra: Record<string, unknown> = {}): unknown[] => [
  { endpoint: '/projects/p1/chat', projectId: 'p1', ...extra },
]

/** A history message with neutral defaults. */
const hmsg = (
  id: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  extra: Partial<ChatMessage> = {},
): ChatMessage => ({ id, role, content, timestamp: 0, ...extra })

/** The case context for one chat seed. */
const chatArea = (chat: ChatSeed, extra: BindingContext = {}): BindingContext => ({
  ...extra,
  areas: { chat },
})

/** `convergeHistory(prev, history)` args helper. */
const converge = (prev: ChatMessage[], history: ChatMessage[]): unknown[] => [prev, history]

/** `localOnlyMessages(prev, history)` args helper. */
const localOnly = (prev: ChatMessage[], history: ChatMessage[]): unknown[] => [prev, history]

/**
 * `useChatProvider()`: the ChatProvider from the nearest provider.
 */
export const useChatProviderCases: HookCases = {
  hook: 'useChatProvider',
  cases: [
    {
      name: 'returns the chat provider from context',
      args: [],
      context: chatArea({}),
      steps: [
        // Calls through the returned provider reach the recorded chat service.
        { type: 'call', method: 'loadHistory', args: [{ endpoint: '/x' }] },
        { type: 'call', method: 'clearHistory', args: [{ endpoint: '/x' }] },
      ],
    },
    {
      // No chat service: the hook itself throws, which the result records as
      // `{ $threw }` — every framework must throw here too.
      name: 'throws without the chat provider',
      context: { omitServices: ['chat'] },
    },
  ],
}

/** `useChat()`: message state, streaming, errors, queueing and the controls. */
export const useChatCases: HookCases = {
  hook: 'useChat',
  cases: [
    // ── Mount and history ────────────────────────────────────────────────────
    {
      name: 'loads the server history on mount',
      args: withHistory(),
      context: chatArea({
        history: [[hmsg('s1', 'user', 'hello'), hmsg('a1', 'assistant', 'hi there')]],
      }),
    },
    {
      name: 'skips the history load when loadOnMount is false',
      args: noHistory(),
      context: chatArea({}),
    },
    {
      name: 'an empty history leaves the transcript empty',
      args: withHistory(),
      context: chatArea({ history: [[]] }),
    },
    {
      name: 'a failed history load is swallowed without an error',
      args: withHistory(),
      context: chatArea({ historyError: 'history is gone' }),
    },
    {
      name: 'the server-persisted mode and fastMode hydrate from the history meta',
      args: withHistory({ onModeChange: { $fn: 'onModeChange' } }),
      context: chatArea({
        history: [[hmsg('s1', 'user', 'hello')]],
        meta: [{ mode: 'plan', fastMode: true }],
      }),
    },
    {
      name: 'server streaming on mount resumes into the last assistant message',
      args: withHistory(),
      context: chatArea({
        history: [[hmsg('s1', 'user', 'hello'), hmsg('a1', 'assistant', 'par')]],
        serverStreaming: [true],
      }),
      fakeTimers: true,
      steps: [
        { type: 'advance', ms: 1000 },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a2', timestamp: 2000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'tial' }] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'server streaming with a trailing user message resumes into a fresh placeholder',
      args: withHistory(),
      context: chatArea({ history: [[hmsg('s1', 'user', 'hello')]], serverStreaming: [true] }),
      fakeTimers: true,
      steps: [
        { type: 'advance', ms: 1000 },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a2', timestamp: 2000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'done!' }] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },

    {
      // No chat service: the hook throws on every render, recorded as
      // `{ $threw }` — every framework must throw here too.
      name: 'throws without the chat provider',
      context: { omitServices: ['chat'] },
    },

    // ── Sending and streaming ────────────────────────────────────────────────
    {
      name: 'a send streams text into per-message blocks behind a 50ms flush',
      args: noHistory({ onStreamEvent: { $fn: 'onStreamEvent' } }),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'He' }] },
        { type: 'advance', ms: 50 },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'llo' }] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'attachments are sent with the message and kept as metadata on the bubble',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        {
          type: 'call',
          method: 'sendMessage',
          args: [
            'look at this',
            [{ mediaType: 'text/plain', data: 'aGk=', filename: 'a.txt', size: 3 }],
          ],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'a stream that ends without a terminal event converges on the server transcript',
      args: noHistory(),
      context: chatArea({
        history: [[hmsg('s1', 'user', 'hi'), hmsg('a1', 'assistant', 'partial done')]],
      }),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'partial' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'a second send while the first streams queues behind it and drains after',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['first'] },
        { type: 'call', method: 'sendMessage', args: ['second'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'one' }] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a2', timestamp: 2000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'two' }] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'send flags flow to the provider config and the local bubble',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        {
          type: 'call',
          method: 'sendMessage',
          args: ['auto fix', undefined, { messageId: 'm1', automatic: true, viaDictation: true }],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'suppressUserMessage sends without a local bubble',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        {
          type: 'call',
          method: 'sendMessage',
          args: ['the answer', undefined, { suppressUserMessage: true, messageId: 'k1' }],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'an askUserAnswer send resolves the pending ask_user card in place',
      args: withHistory(),
      context: chatArea({
        history: [
          [
            hmsg('am1', 'assistant', '', {
              toolCalls: [
                {
                  id: 'ask1',
                  name: 'ask_user',
                  input: { question: 'Pick one' },
                  status: 'running',
                },
              ],
            }),
          ],
        ],
      }),
      fakeTimers: true,
      steps: [
        {
          type: 'call',
          method: 'sendMessage',
          args: [
            'Option A',
            undefined,
            { askUserAnswer: true, suppressUserMessage: true, messageId: 'ans1' },
          ],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'a rejected send surfaces the error and finalizes the partial message',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'par' }] },
        { type: 'control', name: 'chat.fail', args: ['the request exploded'] },
      ],
    },
    {
      name: 'an empty streamed turn is dropped from the transcript',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'the stall watchdog aborts a silent stream and reconciles',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'par' }] },
        { type: 'advance', ms: 50 },
        { type: 'advance', ms: 180000 },
      ],
    },

    // ── Stream event structure ───────────────────────────────────────────────
    {
      name: 'thinking deltas merge into one block between text blocks',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'A' }] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'thinking', content: 'hm' }] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'thinking', content: ' mm' }] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'B' }] },
        { type: 'advance', ms: 50 },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'a tool call streams from start through input deltas to its result',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        {
          type: 'control',
          name: 'chat.emit',
          // A delta for a call that has not started is ignored.
          args: [
            { type: 'tool_input_delta', id: 't1', chars: 3, partialInput: { path: 'app.ts' } },
          ],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'tool_use_start', id: 't1', name: 'write_file' }],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [
            { type: 'tool_input_delta', id: 't1', chars: 4, partialInput: { path: 'app.ts' } },
          ],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [
            {
              type: 'tool_use',
              id: 't1',
              name: 'write_file',
              input: { path: 'app.ts', content: 'x' },
            },
          ],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'tool_result', id: 't1', output: { ok: true } }],
        },
        { type: 'advance', ms: 50 },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'a tool call without tool_use_start completes and derives error status from its output',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'tool_use', id: 't2', name: 'run_command', input: { cmd: 'ls' } }],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'tool_result', id: 't2', output: { error: 'boom' } }],
        },
        { type: 'advance', ms: 50 },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'an orphan tool_result lands on the message that holds the call',
      args: withHistory(),
      context: chatArea({
        history: [
          [
            hmsg('old1', 'assistant', 'earlier', {
              toolCalls: [
                { id: 't9', name: 'read_file', input: { path: 'a.ts' }, status: 'running' },
              ],
            }),
          ],
        ],
      }),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['next'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'tool_result', id: 't9', output: 'data' }],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'file_diff attaches to the matching write tool and reports onFileChange',
      args: noHistory({ onFileChange: { $fn: 'onFileChange' } }),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [
            {
              type: 'tool_use',
              id: 't1',
              name: 'write_file',
              input: { path: '/workspace/app.ts' },
            },
          ],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [
            { type: 'file_diff', path: '/workspace/app.ts', oldContent: 'old', newContent: 'new' },
          ],
        },
        { type: 'advance', ms: 50 },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'a file_diff with no matching tool still reports onFileChange',
      args: noHistory({ onFileChange: { $fn: 'onFileChange' } }),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'file_diff', path: 'other.ts', oldContent: null, newContent: 'new' }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'commit_suggestion marks the streaming message pending',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'commit_suggestion', files: ['a.ts', 'b.ts'] }],
        },
        { type: 'advance', ms: 50 },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'verification and resource_limit events append blocks',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [
            { type: 'verification_result', status: 'ok', workspaces: ['w1'], categories: ['type'] },
          ],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [
            { type: 'resource_limit', resource: 'memory', message: 'Sandbox hit its memory cap' },
          ],
        },
        { type: 'advance', ms: 50 },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'a compaction appends its notice as a text block without touching content',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [
            { type: 'compaction', compactedCount: 2, remainingCount: 5, summary: 'the summary' },
          ],
        },
        { type: 'advance', ms: 50 },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'loop_limit_reached is kept on the message',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'loop_limit_reached', maxLoops: 25 }],
        },
        { type: 'advance', ms: 50 },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'a card event becomes a system card message deduped by id',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'card', id: 'c1', timestamp: 3000, card: { kind: 'mode', mode: 'plan' } }],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'card', id: 'c1', timestamp: 3000, card: { kind: 'mode', mode: 'plan' } }],
        },
        {
          type: 'call',
          method: 'appendCardMessage',
          args: ['c1', 3000, { kind: 'mode', mode: 'plan' }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'a message event appends a complete team note deduped by id',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [
            {
              type: 'message',
              message: {
                id: 'n1',
                role: 'system',
                content: 'a team note',
                timestamp: 9,
                teamOnly: true,
                author: { id: 't1', name: 'Teammate' },
              },
            },
          ],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [
            {
              type: 'message',
              message: {
                id: 'n1',
                role: 'system',
                content: 'a team note',
                timestamp: 9,
                teamOnly: true,
                author: { id: 't1', name: 'Teammate' },
              },
            },
          ],
        },
        {
          type: 'control',
          name: 'chat.emit',
          // A hidden message is tracked but never shown.
          args: [
            {
              type: 'message',
              message: { id: 'h1', role: 'user', content: 'x', timestamp: 10, hidden: true },
            },
          ],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'a second message_start finalizes the previous message and opens a new one',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'first ' }] },
        { type: 'advance', ms: 50 },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a2', timestamp: 2000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'second' }] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'mode events switch mode and notify onModeChange',
      args: noHistory({ onModeChange: { $fn: 'onModeChange' } }),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'mode', mode: 'plan' }] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'mode', mode: 'execute' }] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'the conversation id is reported through onConversationId',
      args: noHistory({ onConversationId: { $fn: 'onConversationId' } }),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'conversation', id: 'conv-9' }] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'status labels dwell, collapse duplicates and clear after a beat',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'status', label: 'Type-checking the API' }],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'status', label: 'Type-checking the API' }],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'status', label: 'Type-checking the API' }],
        },
        { type: 'advance', ms: 650 },
        { type: 'control', name: 'chat.emit', args: [{ type: 'status', label: null }] },
        { type: 'advance', ms: 651 },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'a pending status clear superseded by a label never blanks the spinner',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'status', label: 'Type-checking the API' }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'status', label: null }] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'status', label: 'Linting the app' }],
        },
        { type: 'advance', ms: 651 },
        { type: 'control', name: 'chat.emit', args: [{ type: 'status', label: null }] },
        { type: 'advance', ms: 651 },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'background tasks merge and a finished task is not reopened',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [
            {
              type: 'background_task',
              task: {
                id: 'bg1',
                kind: 'command',
                command: 'npm test',
                status: 'running',
                outputChars: 5,
                startedAt: 100,
              },
            },
          ],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [
            {
              type: 'background_task',
              task: {
                id: 'bg1',
                kind: 'command',
                command: 'npm test',
                status: 'succeeded',
                outputChars: 12,
                exitCode: 0,
                startedAt: 100,
                finishedAt: 500,
              },
            },
          ],
        },
        {
          type: 'control',
          name: 'chat.emit',
          // A late "running" frame cannot reopen the finished task.
          args: [
            {
              type: 'background_task',
              task: {
                id: 'bg1',
                kind: 'command',
                command: 'npm test',
                status: 'running',
                outputChars: 3,
                startedAt: 100,
              },
            },
          ],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'context_usage events change nothing',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'context_usage', usage: { inputTokens: 10, contextWindow: 1000 } }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'panel-level events during a stream store nothing',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'designing' }] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'ready_to_build' }] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'client_action', action: 'reload_preview' }],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'preview_error', errors: [{ message: 'boom' }] }],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [
            { type: 'custom', name: 'upgrade_prompt', data: { tier: 'pro' }, timestamp: 1000 },
          ],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [
            {
              type: 'activity',
              activity: {
                id: 'act1',
                type: 'email',
                status: 'sent',
                timestamp: '2026-01-01T00:00:00.000Z',
              },
            },
          ],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'attached adopts the running turn message and streams into it',
      args: noHistory(),
      context: chatArea({
        history: [[hmsg('s1', 'user', 'hi'), hmsg('a1', 'assistant', 'partial an')]],
      }),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'attached', messageId: 'a1', timestamp: 500 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'swer' }] },
        { type: 'advance', ms: 50 },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'attached with no local copy opens the message fresh',
      args: noHistory(),
      context: chatArea({ history: [[]] }),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'attached' }] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'attached', messageId: 'a9', timestamp: 700 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'new text' }] },
        { type: 'advance', ms: 50 },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },

    // ── Errors, limits and retries ───────────────────────────────────────────
    {
      name: 'a limit error surfaces error and errorMeta with the billing action',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [
            {
              type: 'error',
              message: 'Your balance is empty',
              limitType: 'usage_balance',
              billingAction: 'add_funds',
              upgradeTier: null,
            },
          ],
        },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'a requiresSignup error never auto-retries and sets no errorMeta',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'error', message: 'Sign up to keep building', requiresSignup: true }],
        },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'an upgrade limit names the target tier',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [
            {
              type: 'error',
              message: 'You hit your spend cap',
              limitType: 'spend_cap',
              billingAction: 'upgrade',
              upgradeTier: 'pro',
            },
          ],
        },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'a 4XX error surfaces without a retry countdown',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'error', message: 'Bad request', status: 400 }],
        },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'a 5XX error counts down and auto-resumes the turn',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'conversation', id: 'c9' }] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'Par' }] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'error', message: 'Overloaded', status: 503 }],
        },
        { type: 'control', name: 'chat.finish' },
        { type: 'advance', ms: 5000 },
        { type: 'advance', ms: 1000 },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a2', timestamp: 2000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'tial' }] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'cancelRetry stops the countdown and surfaces the original error',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'conversation', id: 'c9' }] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'error', message: 'Overloaded', status: 503 }],
        },
        { type: 'call', method: 'cancelRetry' },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'a transport drop before any server event re-sends the original message',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'error', message: 'Connection died', transport: true }],
        },
        { type: 'control', name: 'chat.finish' },
        { type: 'advance', ms: 5000 },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'ok' }] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'the retry ladder gives up after eight attempts and surfaces the error',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'conversation', id: 'c9' }] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'error', message: 'Overloaded', status: 503 }],
        },
        { type: 'control', name: 'chat.finish' },
        { type: 'advance', ms: 6000 },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'error', message: 'Overloaded', status: 503 }],
        },
        { type: 'control', name: 'chat.finish' },
        { type: 'advance', ms: 11000 },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'error', message: 'Overloaded', status: 503 }],
        },
        { type: 'control', name: 'chat.finish' },
        { type: 'advance', ms: 21000 },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'error', message: 'Overloaded', status: 503 }],
        },
        { type: 'control', name: 'chat.finish' },
        { type: 'advance', ms: 31000 },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'error', message: 'Overloaded', status: 503 }],
        },
        { type: 'control', name: 'chat.finish' },
        { type: 'advance', ms: 31000 },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'error', message: 'Overloaded', status: 503 }],
        },
        { type: 'control', name: 'chat.finish' },
        { type: 'advance', ms: 31000 },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'error', message: 'Overloaded', status: 503 }],
        },
        { type: 'control', name: 'chat.finish' },
        { type: 'advance', ms: 31000 },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'error', message: 'Overloaded', status: 503 }],
        },
        { type: 'control', name: 'chat.finish' },
        { type: 'advance', ms: 31000 },
        // Attempt 8 was the last: the ninth error surfaces instead of scheduling.
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'error', message: 'Overloaded', status: 503 }],
        },
        { type: 'control', name: 'chat.finish' },
      ],
    },

    // ── Stop, abort and unmount ──────────────────────────────────────────────
    {
      name: 'abort keeps the streamed content and flags the message aborted',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'par' }] },
        { type: 'advance', ms: 50 },
        { type: 'call', method: 'abort' },
      ],
    },
    {
      name: 'a stop drops autonomous automatic sends until the user re-engages',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['first'] },
        { type: 'call', method: 'abort' },
        {
          type: 'call',
          method: 'sendMessage',
          args: ['Fix these issues: app.ts', undefined, { automatic: true }],
        },
        {
          type: 'call',
          method: 'sendMessage',
          args: ['Fix these issues: app.ts', undefined, { automatic: true, userInitiated: true }],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'unmount mid-stream keeps the store filling and never aborts',
      args: noHistory({ onStreamEvent: { $fn: 'onStreamEvent' } }),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'partial' }] },
        { type: 'unmount' },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'more' }] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },

    // ── Queueing ─────────────────────────────────────────────────────────────
    {
      name: 'a durable queue sends through queueMessage and delivers after the turn',
      args: noHistory(),
      context: chatArea({ durable: true }),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['a'] },
        { type: 'call', method: 'sendMessage', args: ['b'] },
        {
          type: 'control',
          name: 'chat.queueEmit',
          args: [
            {
              type: 'message',
              message: { id: 'uuid-2', role: 'user', content: 'b', queued: true, timestamp: 7 },
            },
          ],
        },
        { type: 'control', name: 'chat.queueAccept' },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
        {
          type: 'control',
          name: 'chat.emit',
          args: [
            {
              type: 'message',
              message: { id: 'uuid-2', role: 'user', content: 'b', timestamp: 8 },
            },
          ],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a2', timestamp: 2000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'a server-queued message is delivered on mount',
      args: withHistory(),
      context: chatArea({
        durable: true,
        history: [[hmsg('q1', 'user', 'queued up', { queued: true })]],
      }),
      fakeTimers: true,
      steps: [
        {
          type: 'control',
          name: 'chat.emit',
          args: [
            {
              type: 'message',
              message: { id: 'q1', role: 'user', content: 'queued up', timestamp: 5 },
            },
          ],
        },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'a local queued message is edited and deleted without provider calls',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['a'] },
        { type: 'call', method: 'sendMessage', args: ['b'] },
        { type: 'call', method: 'editQueuedMessage', args: ['uuid-2', 'b edited'] },
        { type: 'call', method: 'deleteQueuedMessage', args: ['uuid-2'] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'a durable queued message is edited and deleted through the provider',
      args: noHistory(),
      context: chatArea({ durable: true }),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['a'] },
        { type: 'call', method: 'sendMessage', args: ['b'] },
        { type: 'call', method: 'editQueuedMessage', args: ['uuid-2', 'b edited'] },
        { type: 'call', method: 'deleteQueuedMessage', args: ['uuid-2'] },
        { type: 'control', name: 'chat.queueAccept' },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'a queue_removed event drops the queued message',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['a'] },
        { type: 'call', method: 'sendMessage', args: ['b'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'queue_removed', messageId: 'uuid-2' }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'clearQueuedForFile removes queued autofix messages for that file',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['first'] },
        { type: 'call', method: 'sendMessage', args: ['Fix these issues: app.ts fails typecheck'] },
        { type: 'call', method: 'clearQueuedForFile', args: ['/workspace/other.ts'] },
        { type: 'call', method: 'clearQueuedForFile', args: ['/workspace/app.ts'] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },

    // ── Remote turns, watching and reconciling ───────────────────────────────
    {
      name: 'readOnly mounts follow a server-streaming turn without sending',
      args: withHistory({ readOnly: true }),
      context: chatArea({
        history: [[hmsg('s1', 'user', 'hello'), hmsg('a1', 'assistant', 'their answer')]],
        serverStreaming: [true, true, false],
      }),
      fakeTimers: true,
      steps: [{ type: 'advance', ms: 3000 }],
    },
    {
      name: 'pushed remote frames build a teammate turn live without isLoading',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        {
          type: 'call',
          method: 'applyRemoteEvent',
          args: [{ type: 'message_start', id: 'r1', timestamp: 5000 }],
        },
        { type: 'call', method: 'applyRemoteEvent', args: [{ type: 'text', content: 'Hi' }] },
        { type: 'advance', ms: 50 },
        {
          type: 'call',
          method: 'applyRemoteEvent',
          args: [
            {
              type: 'background_task',
              task: {
                id: 'bg1',
                kind: 'command',
                command: 'npm test',
                status: 'running',
                startedAt: 100,
              },
            },
          ],
        },
        { type: 'call', method: 'applyRemoteEvent', args: [{ type: 'done' }] },
      ],
    },
    {
      name: 'a remote user message is not doubled while the own stream runs',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['mine'] },
        {
          type: 'call',
          method: 'applyRemoteEvent',
          args: [
            {
              type: 'message',
              message: { id: 'rm1', role: 'user', content: 'theirs', timestamp: 9 },
            },
          ],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
        {
          type: 'call',
          method: 'applyRemoteEvent',
          args: [
            {
              type: 'message',
              message: { id: 'rm1', role: 'user', content: 'theirs', timestamp: 9 },
            },
          ],
        },
      ],
    },
    {
      name: 'noteRemoteStreamEvent polls history while the server streams and stops when it ends',
      args: noHistory(),
      context: chatArea({
        history: [[hmsg('s1', 'user', 'from the server')]],
        serverStreaming: [true, false],
      }),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'noteRemoteStreamEvent' },
        { type: 'advance', ms: 3000 },
      ],
    },
    {
      name: 'reconcileHistory converges without rewinding streamed text',
      args: noHistory(),
      context: chatArea({
        history: [[hmsg('s1', 'user', 'hi'), hmsg('a1', 'assistant', 'Hel')]],
      }),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'Hello' }] },
        { type: 'advance', ms: 50 },
        { type: 'call', method: 'reconcileHistory' },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'a remote mode frame switches mode',
      args: noHistory({ onModeChange: { $fn: 'onModeChange' } }),
      context: chatArea({}),
      steps: [{ type: 'call', method: 'applyRemoteEvent', args: [{ type: 'mode', mode: 'plan' }] }],
    },

    // ── Conversation and project changes ─────────────────────────────────────
    {
      name: 'a page unload aborts the server stream and keeps the resume flag',
      args: [{ endpoint: '/projects/p1/chat?conversationId=c1', projectId: 'p1' }],
      context: chatArea({
        history: [[], [hmsg('s2', 'user', 'next'), hmsg('a9', 'assistant', 'old')]],
      }),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['hi'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'x' }] },
        { type: 'control', name: 'chat.pageUnload' },
        { type: 'control', name: 'chat.finish' },
        {
          type: 'args',
          args: [{ endpoint: '/projects/p1/chat?conversationId=c2', projectId: 'p1' }],
        },
        { type: 'advance', ms: 1000 },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a3', timestamp: 3000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'resumed' }] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'switching conversation mid-stream stops the old stream from writing',
      // The store is module-level and shared across hosts, so a framework that
      // re-mounts on `args` sees the same cleared transcript as React.
      args: [
        { endpoint: '/projects/p1/chat?conversationId=c1', projectId: 'p1', loadOnMount: false },
      ],
      context: chatArea({
        history: [[], [hmsg('s2', 'user', 'next'), hmsg('a2', 'assistant', 'other')]],
      }),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['one'] },
        {
          type: 'control',
          name: 'chat.emit',
          args: [{ type: 'message_start', id: 'a1', timestamp: 1000 }],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'old' }] },
        {
          type: 'args',
          args: [
            {
              endpoint: '/projects/p1/chat?conversationId=c2',
              projectId: 'p1',
              loadOnMount: false,
            },
          ],
        },
        { type: 'control', name: 'chat.emit', args: [{ type: 'text', content: 'stale' }] },
        // The switch releases the orphaned stream's send slot, so a send in the
        // new conversation starts its own turn instead of queueing behind it.
        { type: 'call', method: 'sendMessage', args: ['after switch'] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
    {
      name: 'changing projectId swaps to a fresh store without reloading history',
      // React's history effect depends on the endpoint only, so a projectId
      // change re-subscribes to a new (empty) store but issues no new load.
      // Frameworks that re-mount the host on `args` must guard the same way.
      args: [{ endpoint: '/chat', projectId: 'p1' }],
      context: chatArea({ history: [[hmsg('s1', 'user', 'hello')]] }),
      steps: [{ type: 'args', args: [{ endpoint: '/chat', projectId: 'p2' }] }],
    },

    // ── Methods ──────────────────────────────────────────────────────────────
    {
      name: 'clearHistory empties the transcript and the server',
      args: withHistory(),
      context: chatArea({
        history: [[hmsg('s1', 'user', 'hello'), hmsg('a1', 'assistant', 'hi')]],
      }),
      steps: [{ type: 'call', method: 'clearHistory' }],
    },
    {
      name: 'setMode and setFastMode update local state and notify',
      args: noHistory({ onModeChange: { $fn: 'onModeChange' } }),
      context: chatArea({}),
      steps: [
        { type: 'call', method: 'setMode', args: ['plan'] },
        { type: 'call', method: 'setFastMode', args: [true] },
      ],
    },
    {
      name: 'appendCardMessage appends a card message deduped by id',
      args: noHistory(),
      context: chatArea({}),
      steps: [
        {
          type: 'call',
          method: 'appendCardMessage',
          args: ['c9', 42, { kind: 'skills', count: 3 }],
        },
        {
          type: 'call',
          method: 'appendCardMessage',
          args: ['c9', 42, { kind: 'skills', count: 3 }],
        },
      ],
    },
    {
      name: 'appendCompleteMessage appends a message deduped by id',
      args: noHistory(),
      context: chatArea({}),
      steps: [
        {
          type: 'call',
          method: 'appendCompleteMessage',
          args: [hmsg('n2', 'system', 'a note', { teamOnly: true })],
        },
        {
          type: 'call',
          method: 'appendCompleteMessage',
          args: [hmsg('n2', 'system', 'a note', { teamOnly: true })],
        },
      ],
    },
    {
      name: 'a side-channel send goes through sendSideMessage without a turn',
      args: noHistory(),
      context: chatArea({ sideChannel: true }),
      steps: [
        { type: 'call', method: 'sendMessage', args: ['a note', undefined, { sideChannel: true }] },
        {
          type: 'control',
          name: 'chat.sideEmit',
          args: [
            {
              type: 'message',
              message: {
                id: 'n1',
                role: 'system',
                content: 'a note',
                timestamp: 9,
                teamOnly: true,
              },
            },
          ],
        },
        { type: 'control', name: 'chat.sideFinish' },
      ],
    },
    {
      name: 'a side-channel error surfaces as the hook error',
      args: noHistory(),
      context: chatArea({ sideChannel: true }),
      steps: [
        { type: 'call', method: 'sendMessage', args: ['a note', undefined, { sideChannel: true }] },
        { type: 'control', name: 'chat.sideEmit', args: [{ type: 'error', message: 'nope' }] },
        { type: 'control', name: 'chat.sideFail', args: ['side channel down'] },
      ],
    },
    {
      name: 'a side-channel send without provider support falls back to a normal turn',
      args: noHistory(),
      context: chatArea({}),
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'sendMessage', args: ['a note', undefined, { sideChannel: true }] },
        { type: 'control', name: 'chat.emit', args: [{ type: 'done' }] },
        { type: 'control', name: 'chat.finish' },
      ],
    },
  ],
}

/** `convergeHistory(prev, history)`: merge a server transcript without rewinding. */
export const convergeHistoryCases: HookCases = {
  hook: 'convergeHistory',
  cases: [
    {
      name: 'messages only the server has are added in its order',
      args: converge([], [hmsg('s1', 'user', 'one'), hmsg('a1', 'assistant', 'two')]),
    },
    {
      name: 'a tie keeps the local copy',
      args: converge([hmsg('x', 'user', 'same', { aborted: true })], [hmsg('x', 'user', 'same')]),
    },
    {
      name: 'the further-along server copy wins',
      args: converge([hmsg('x', 'assistant', 'ab')], [hmsg('x', 'assistant', 'abc')]),
    },
    {
      name: 'a further-along local copy wins and keeps streaming',
      args: converge(
        [hmsg('x', 'assistant', 'abcd', { isStreaming: true })],
        [hmsg('x', 'assistant', 'ab')],
      ),
    },
    {
      name: 'a further-along server copy inherits the local streaming flag',
      args: converge(
        [hmsg('x', 'assistant', 'ab', { isStreaming: true })],
        [hmsg('x', 'assistant', 'abc')],
      ),
    },
    {
      name: 'a queued local copy defers to the server copy',
      args: converge(
        [hmsg('x', 'user', 'local draft', { queued: true })],
        [hmsg('x', 'user', 'server copy')],
      ),
    },
    {
      name: 'a queued server copy defers to the local copy',
      args: converge(
        [hmsg('x', 'user', 'local copy')],
        [hmsg('x', 'user', 'still queued', { queued: true })],
      ),
    },
    {
      name: 'a local-only message stays after the merged history',
      args: converge(
        [hmsg('a', 'assistant', 'kept'), hmsg('b', 'user', 'also kept')],
        [hmsg('a', 'assistant', 'kept')],
      ),
    },
    {
      name: 'the optimistic echo of a persisted user message is dropped',
      args: converge(
        [hmsg('u-local', 'user', 'hi')],
        [hmsg('s1', 'user', 'hi'), hmsg('a1', 'assistant', 'hello')],
      ),
    },
    {
      name: 'an empty history keeps only local-only messages',
      args: converge([hmsg('a', 'assistant', 'kept')], []),
    },
    {
      name: 'a message with tool calls scores ahead of equal-length text',
      args: converge(
        [
          hmsg('x', 'assistant', '', {
            toolCalls: [{ id: 't1', name: 'read_file', input: {}, status: 'running' }],
            blocks: [{ type: 'tool_call', id: 't1' }],
          }),
        ],
        [hmsg('x', 'assistant', 'x'.repeat(55))],
      ),
    },
  ],
}

/** `localOnlyMessages(prev, history)`: the messages only the local store holds. */
export const localOnlyMessagesCases: HookCases = {
  hook: 'localOnlyMessages',
  cases: [
    {
      name: 'messages the server lacks are kept',
      args: localOnly([hmsg('a', 'assistant', 'mine')], [hmsg('b', 'assistant', 'theirs')]),
    },
    {
      name: 'a user message echoed by the server is dropped',
      args: localOnly(
        [hmsg('u1', 'user', 'hi'), hmsg('a1', 'assistant', 'answer')],
        [hmsg('s1', 'user', 'hi')],
      ),
    },
    {
      name: 'a queued user message is never an echo',
      args: localOnly([hmsg('u1', 'user', 'hi', { queued: true })], [hmsg('s1', 'user', 'hi')]),
    },
    {
      name: 'an assistant message with the same content is kept',
      args: localOnly([hmsg('a1', 'assistant', 'hi')], [hmsg('s1', 'assistant', 'hi')]),
    },
  ],
}

/** `resetChatStoresForTests()`: clear the module-level conversation stores. */
export const resetChatStoresForTestsCases: HookCases = {
  hook: 'resetChatStoresForTests',
  cases: [{ name: 'clearing the stores returns undefined', args: [] }],
}

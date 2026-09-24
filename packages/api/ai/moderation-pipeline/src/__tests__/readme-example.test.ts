/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. The AI goes through the real Anthropic
 * bond with only `fetch` mocked (a Messages-API SSE stream); the postgresql
 * bond is replaced by an in-test DataStore so no database driver is needed.
 *
 * @module
 */
const { fakeStore } = vi.hoisted(() => ({
  fakeStore: {
    findById: vi.fn(),
    findOne: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    updateMany: vi.fn(),
    deleteById: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock('@molecule/api-database-postgresql', () => ({ store: fakeStore }))

import { afterEach, describe, expect, it, vi } from 'vitest'

import { setProvider } from '@molecule/api-ai'
import { createProvider } from '@molecule/api-ai-anthropic'
import { setStore } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'

import { DEFAULT_POLICY, moderate } from '../index.js'

/**
 * Builds a streaming fetch Response whose Anthropic SSE stream yields `text` as one text block.
 *
 * @param text - The model's full reply text.
 * @returns A minimal streaming Response.
 */
function sseTextResponse(text: string): Response {
  const events: Array<Record<string, unknown>> = [
    { type: 'message_start', message: { usage: { input_tokens: 40 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } },
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', usage: { output_tokens: 30 } },
    { type: 'message_stop' },
  ]
  const body = events.map((e) => `data: ${JSON.stringify(e)}`).join('\n') + '\n'
  return new Response(new TextEncoder().encode(body), {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('classifies, blocks over-threshold content and writes the audit row', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    const reply = JSON.stringify({
      scores: {
        hate: 0,
        harassment: 0,
        sexual: 0,
        self_harm: 0,
        violence: 0,
        illegal: 0.2,
        spam: 0.97,
        misinformation: 0,
        pii: 0,
      },
      reasoning: 'Commercial spam with a link.',
    })
    const fetchMock = vi.fn(async () => sseTextResponse(reply))
    vi.stubGlobal('fetch', fetchMock)
    fakeStore.create.mockResolvedValue({ data: { id: 'audit-1' }, affected: 1 })

    setProvider(createProvider({ apiKey: process.env.ANTHROPIC_API_KEY }))
    setStore(store)

    const comment = { id: 'c-42', authorId: 'user-123', body: 'Buy cheap pills at spam.example!!!' }
    const decision = await moderate({
      content: comment.body,
      ownerId: comment.authorId,
      resource: { type: 'comment', id: comment.id },
      policy: { ...DEFAULT_POLICY, action: 'block' },
    })

    expect(decision.action).toBe('block')
    expect(decision.matched_category).toBe('spam')
    expect(decision.flagged).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fakeStore.create).toHaveBeenCalledWith(
      'moderation_audit_log',
      expect.objectContaining({
        owner_id: 'user-123',
        decision: 'block',
        matched_category: 'spam',
        resource_type: 'comment',
        resource_id: 'c-42',
      }),
    )
  })

  it('holds content for review (flag) when the classifier reply is unusable', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => sseTextResponse('I cannot classify this.')),
    )
    fakeStore.create.mockResolvedValue({ data: { id: 'audit-2' }, affected: 1 })
    setProvider(createProvider({ apiKey: process.env.ANTHROPIC_API_KEY }))
    setStore(store)

    const decision = await moderate({ content: 'hello', ownerId: 'user-123' })
    expect(decision.action).toBe('flag')
    expect(decision.errored).toBe(true)
  })
})

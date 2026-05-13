const { mockRequireAI, mockChat } = vi.hoisted(() => ({
  mockRequireAI: vi.fn(),
  mockChat: vi.fn(),
}))

vi.mock('@molecule/api-ai', () => ({
  requireProvider: mockRequireAI,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { composeEmail } from '../index.js'

function streamChunks(chunks: string[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const text of chunks) yield { type: 'text', text }
    },
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockRequireAI.mockReturnValue({ chat: mockChat })
})

describe('composeEmail', () => {
  it('parses well-formed JSON into subject + body + reasoning', async () => {
    mockChat.mockReturnValue(
      streamChunks(['{"subject":"Hi","body":"Hello.\\n\\nThanks,\\nA","reasoning":"r"}']),
    )
    const out = await composeEmail({ brief: 'say hi' })
    expect(out.subject).toBe('Hi')
    expect(out.body).toContain('Hello.')
    expect(out.reasoning).toBe('r')
  })

  it('falls back to a placeholder draft when JSON is malformed', async () => {
    mockChat.mockReturnValue(streamChunks(['not json at all']))
    const out = await composeEmail({ brief: 'b' })
    expect(out.subject).toBe('(draft failed)')
    expect(out.body).toBe('not json at all') // raw is preserved for the user
    expect(out.reasoning).toBe('malformed JSON')
  })

  it('strips ```json fences before parsing', async () => {
    mockChat.mockReturnValue(streamChunks(['```json\n{"subject":"S","body":"B"}\n```']))
    const out = await composeEmail({ brief: 'b' })
    expect(out.subject).toBe('S')
  })

  it('substitutes brief / audience / sender into the prompt', async () => {
    mockChat.mockReturnValue(streamChunks(['{"subject":"","body":""}']))
    await composeEmail({
      brief: 'CONFIRM THE SHIPMENT',
      audience: 'the warehouse team',
      senderName: 'Jane Doe',
    })
    const prompt = mockChat.mock.calls[0][0].messages[0].content
    expect(prompt).toContain('CONFIRM THE SHIPMENT')
    expect(prompt).toContain('the warehouse team')
    expect(prompt).toContain('Jane Doe')
    expect(prompt).not.toContain('{{BRIEF}}')
    expect(prompt).not.toContain('{{AUDIENCE}}')
    expect(prompt).not.toContain('{{SENDER}}')
  })

  it('defaults sender to "the user" when no senderName supplied', async () => {
    mockChat.mockReturnValue(streamChunks(['{"subject":"","body":""}']))
    await composeEmail({ brief: 'b' })
    expect(mockChat.mock.calls[0][0].messages[0].content).toContain('the user')
  })

  it('defaults tone to professional and length to medium', async () => {
    mockChat.mockReturnValue(streamChunks(['{"subject":"","body":""}']))
    await composeEmail({ brief: 'b' })
    const prompt = mockChat.mock.calls[0][0].messages[0].content
    expect(prompt).toContain('professional')
    expect(prompt).toContain('medium')
  })

  it('emits tone-specific guidance when tone is overridden', async () => {
    mockChat.mockReturnValue(streamChunks(['{"subject":"","body":""}']))
    await composeEmail({ brief: 'b', tone: 'apologetic' })
    const prompt = mockChat.mock.calls[0][0].messages[0].content
    expect(prompt).toContain('apologetic')
    expect(prompt).toContain('acknowledges the issue early')
  })

  it('emits length-specific guidance when length is overridden', async () => {
    mockChat.mockReturnValue(streamChunks(['{"subject":"","body":""}']))
    await composeEmail({ brief: 'b', length: 'short' })
    const prompt = mockChat.mock.calls[0][0].messages[0].content
    expect(prompt).toContain('3–5 sentences')
  })

  it('inserts the reply block when inReplyTo is provided', async () => {
    mockChat.mockReturnValue(streamChunks(['{"subject":"","body":""}']))
    await composeEmail({
      brief: 'reply politely',
      inReplyTo: {
        from: 'alice@x.test',
        subject: 'Q3 numbers',
        body: 'Could you send the report?',
      },
    })
    const prompt = mockChat.mock.calls[0][0].messages[0].content
    expect(prompt).toContain('This is a REPLY')
    expect(prompt).toContain('alice@x.test')
    expect(prompt).toContain('Q3 numbers')
    expect(prompt).toContain('Could you send the report?')
  })

  it('falls back to "(unknown)" / "(no subject)" when reply fields are partial', async () => {
    mockChat.mockReturnValue(streamChunks(['{"subject":"","body":""}']))
    await composeEmail({ brief: 'reply', inReplyTo: { body: 'just body' } })
    const prompt = mockChat.mock.calls[0][0].messages[0].content
    expect(prompt).toContain('From: (unknown)')
    expect(prompt).toContain('Subject: (no subject)')
  })

  it('passes temperature=0.4 (some creativity, still mostly deterministic)', async () => {
    mockChat.mockReturnValue(streamChunks(['{"subject":"","body":""}']))
    await composeEmail({ brief: 'b' })
    expect(mockChat.mock.calls[0][0].temperature).toBe(0.4)
  })

  it('honours model override', async () => {
    mockChat.mockReturnValue(streamChunks(['{"subject":"","body":""}']))
    await composeEmail({ brief: 'b', model: 'claude-haiku-4-5-20251001' })
    expect(mockChat.mock.calls[0][0].model).toBe('claude-haiku-4-5-20251001')
  })

  it('ignores non-text events in the AI stream', async () => {
    mockChat.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        yield { type: 'tool_use', name: 'x' }
        yield { type: 'text', text: '{"subject":"S","body":"B"}' }
      },
    })
    const out = await composeEmail({ brief: 'b' })
    expect(out.subject).toBe('S')
  })
})

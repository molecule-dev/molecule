import { beforeEach, describe, expect, it } from 'vitest'

import type { AIProvider, ChatParams } from '@molecule/api-ai'
import { bond, configure, reset } from '@molecule/api-bond'

import { createProvider, provider } from '../provider.js'

let lastParams: ChatParams | null = null

const bondAI = (text: string, name?: string): void => {
  const ai: AIProvider = {
    name: name ?? 'fake',
    async *chat(params: ChatParams) {
      lastParams = params
      yield { type: 'text' as const, content: text }
      yield { type: 'done' as const, usage: { inputTokens: 20, outputTokens: 9 } }
    },
  }
  if (name) bond('ai', name, ai)
  else bond('ai', ai)
}

const QUESTIONS = {
  queue: {
    type: 'choice' as const,
    instructions: 'Which team?',
    criteria: { billing: 'money', tech: 'bugs' },
  },
  urgency: {
    type: 'score' as const,
    instructions: 'How urgent?',
    criteria: ['low', 'mid', 'high'],
  },
  refund: { type: 'yesNo' as const, instructions: 'Wants a refund.' },
}

describe('ai-decisions-llm', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
    lastParams = null
  })

  it('has name "llm"', () => {
    expect(provider.name).toBe('llm')
  })

  it('normalizes the model JSON into typed answers', async () => {
    bondAI(
      '```json\n{"queue":{"probabilities":{"billing":0.8,"tech":0.2}},"urgency":{"probabilities":[0.1,0.3,0.6]},"refund":{"probability":0.9}}\n```',
    )
    const r = await provider.decide({
      state: { body: 'charged twice' },
      questions: QUESTIONS,
      minConfidence: 0.7,
    })
    expect(r.answers.queue).toEqual({
      type: 'choice',
      choice: 'billing',
      probabilities: { billing: 0.8, tech: 0.2 },
      confidence: 0.8,
      lowConfidence: false,
    })
    expect(r.answers.urgency.level).toBe(2)
    expect(r.answers.urgency.score).toBeCloseTo(1.5)
    expect(r.answers.urgency.lowConfidence).toBe(true)
    expect(r.answers.refund).toMatchObject({ probability: 0.9, answer: true, confidence: 0.9 })
    expect(r.usage).toEqual({ inputTokens: 20, outputTokens: 9 })
    expect(lastParams?.temperature).toBe(0)
    expect(String(lastParams?.messages[0]?.content)).toContain('"body": "charged twice"')
  })

  it('renormalizes and restricts to the option keys', async () => {
    bondAI(
      '{"queue":{"probabilities":{"billing":2,"tech":2,"sales":5}},"urgency":{"probabilities":[]},"refund":{"probability":0.1}}',
    )
    const r = await provider.decide({ state: 's', questions: QUESTIONS })
    expect(r.answers.queue.probabilities).toEqual({ billing: 0.5, tech: 0.5 })
    expect(r.answers.urgency.probabilities).toEqual([1 / 3, 1 / 3, 1 / 3])
    expect(r.answers.refund.answer).toBe(false)
  })

  it('throws on unparseable output', async () => {
    bondAI('I think it is billing.')
    await expect(provider.decide({ state: 's', questions: QUESTIONS })).rejects.toThrow(
      /could not parse/,
    )
  })

  it('throws when a question is missing from the output', async () => {
    bondAI('{"queue":{"probabilities":{"billing":1}}}')
    await expect(provider.decide({ state: 's', questions: QUESTIONS })).rejects.toThrow(
      /no answer for question "urgency"/,
    )
  })

  it('uses a named ai provider and model when configured', async () => {
    bondAI('{"refund":{"probability":0.4}}', 'other')
    const p = createProvider({ aiProvider: 'other', model: 'm-1' })
    const r = await p.decide({ state: 's', questions: { refund: QUESTIONS.refund } })
    expect(r.answers.refund.answer).toBe(false)
    expect(lastParams?.model).toBe('m-1')
  })

  it('uses a provider instance passed directly, without bonding it', async () => {
    bondAI('{"refund":{"probability":0.9}}') // the bonded singleton must NOT be used
    const routed: AIProvider = {
      name: 'routed',
      async *chat(params: ChatParams) {
        lastParams = params
        yield { type: 'text' as const, content: '{"refund":{"probability":0.1}}' }
        yield { type: 'done' as const, usage: { inputTokens: 5, outputTokens: 3 } }
      },
    }
    const p = createProvider({ aiProvider: routed, model: 'm-2' })
    const r = await p.decide({ state: 's', questions: { refund: QUESTIONS.refund } })
    expect(r.answers.refund.answer).toBe(false)
    expect(lastParams?.model).toBe('m-2')
  })

  it('passes images to the ai bond as image content blocks before the prompt', async () => {
    bondAI('{"refund":{"probability":0.2}}')
    await provider.decide({
      state: 'receipt',
      questions: { refund: QUESTIONS.refund },
      images: [{ mimeType: 'image/png', data: 'iVBORw0KGgo=' }],
    })
    const content = lastParams?.messages[0]?.content
    expect(Array.isArray(content)).toBe(true)
    const blocks = content as Exclude<typeof content, string | undefined>
    expect(blocks[0]).toEqual({ type: 'image', mediaType: 'image/png', data: 'iVBORw0KGgo=' })
    expect(blocks[1]).toMatchObject({ type: 'text' })
    expect(JSON.stringify(blocks[1])).toContain('attached image(s) are part of the state')
  })
})

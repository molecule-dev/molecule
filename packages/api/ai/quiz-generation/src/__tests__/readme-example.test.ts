/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the Anthropic bond. Only the
 * network is mocked: `fetch` returns real Messages-API SSE streams.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setProvider } from '@molecule/api-ai'
import { createProvider } from '@molecule/api-ai-anthropic'

import { generateQuiz, gradeResponses } from '../index.js'

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
  })

  it('generates a quiz and grades the responses through the bonded AI provider', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    const quizReply = JSON.stringify({
      source_summary: 'Photosynthesis happens in chloroplasts.',
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          prompt: 'Where does photosynthesis happen?',
          options: ['Nucleus', 'Chloroplasts', 'Ribosomes', 'Golgi'],
          answer: 'Chloroplasts',
        },
        {
          id: 'q2',
          type: 'short_answer',
          prompt: 'What energy does photosynthesis convert?',
          answer: 'Light energy',
        },
      ],
    })
    const gradeReply = JSON.stringify([
      { question_id: 'q1', submitted: 'chloroplasts', correct: true, score: 1 },
      { question_id: 'q2', submitted: 'chloroplasts', correct: false, score: 0.5 },
    ])
    const fetchMock = vi
      .fn(async () => sseTextResponse(''))
      .mockImplementationOnce(async () => sseTextResponse(quizReply))
      .mockImplementationOnce(async () => sseTextResponse(gradeReply))
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ apiKey: process.env.ANTHROPIC_API_KEY }))

    const chapterText = 'Photosynthesis converts light energy into chemical energy in chloroplasts.'
    const quiz = await generateQuiz({
      source: chapterText,
      questionCount: 2,
      types: ['multiple_choice', 'short_answer'],
      difficulty: 'easy',
    })
    expect(quiz.questions.map((q) => q.id)).toEqual(['q1', 'q2'])

    const result = await gradeResponses({
      quiz,
      responses: quiz.questions.map((q) => ({ question_id: q.id, submitted: 'chloroplasts' })),
    })

    expect(result).toMatchObject({ earned: 1.5, total: 2, percentage: 75 })
    expect(`${result.earned}/${result.total} (${result.percentage}%)`).toBe('1.5/2 (75%)')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(init.body as string) as { messages: Array<{ content: string }> }
    expect(body.messages[0]?.content).toContain(chapterText)
    expect(body.messages[0]?.content).toContain('- 2 questions')
  })
})

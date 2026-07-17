const { mockRequireAI, mockChat } = vi.hoisted(() => ({
  mockRequireAI: vi.fn(),
  mockChat: vi.fn(),
}))

vi.mock('@molecule/api-ai', () => ({
  requireProvider: mockRequireAI,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { generateQuiz, gradeResponses, type Quiz } from '../index.js'

function streamChunks(chunks: string[]) {
  return {
    async *[Symbol.asyncIterator]() {
      // Real ChatEvent text payload is `content` (see @molecule/api-ai types).
      for (const text of chunks) yield { type: 'text', content: text }
    },
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockRequireAI.mockReturnValue({ chat: mockChat })
})

const SAMPLE_QUIZ: Quiz = {
  questions: [
    { id: 'q1', type: 'multiple_choice', prompt: 'A?', options: ['A', 'B'], answer: 'A' },
    { id: 'q2', type: 'short_answer', prompt: 'Define X', answer: 'a definition' },
  ],
}

describe('generateQuiz', () => {
  it('parses a valid Quiz response from the AI', async () => {
    mockChat.mockReturnValue(
      streamChunks([
        '{"source_summary":"about cats","questions":[{"id":"q1","type":"multiple_choice","prompt":"P","options":["A","B"],"answer":"A"}]}',
      ]),
    )
    const out = await generateQuiz({ source: 'cats are felines' })
    expect(out.questions).toHaveLength(1)
    expect(out.source_summary).toBe('about cats')
    expect(out.questions[0].answer).toBe('A')
  })

  it('returns { questions: [] } when the AI response is malformed', async () => {
    mockChat.mockReturnValue(streamChunks(['junk']))
    const out = await generateQuiz({ source: 'x' })
    expect(out).toEqual({ questions: [] })
  })

  it('strips ```json fences before parsing', async () => {
    mockChat.mockReturnValue(streamChunks(['```json\n{"questions":[]}\n```']))
    const out = await generateQuiz({ source: 'x' })
    expect(out.questions).toEqual([])
  })

  it('substitutes count / types / difficulty / source into the prompt', async () => {
    mockChat.mockReturnValue(streamChunks(['{"questions":[]}']))
    await generateQuiz({
      source: 'CHAPTER ABOUT MITOSIS',
      questionCount: 8,
      types: ['true_false', 'short_answer'],
      difficulty: 'hard',
    })
    const prompt = mockChat.mock.calls[0][0].messages[0].content
    expect(prompt).toContain('8 questions')
    expect(prompt).toContain('true_false, short_answer')
    expect(prompt).toContain('Difficulty: hard')
    expect(prompt).toContain('CHAPTER ABOUT MITOSIS')
  })

  it('defaults to 5 questions / [multiple_choice, short_answer] / medium', async () => {
    mockChat.mockReturnValue(streamChunks(['{"questions":[]}']))
    await generateQuiz({ source: 'x' })
    const prompt = mockChat.mock.calls[0][0].messages[0].content
    expect(prompt).toContain('5 questions')
    expect(prompt).toContain('multiple_choice, short_answer')
    expect(prompt).toContain('Difficulty: medium')
  })

  it('passes temperature 0.3 (generation needs some creativity)', async () => {
    mockChat.mockReturnValue(streamChunks(['{"questions":[]}']))
    await generateQuiz({ source: 'x' })
    expect(mockChat.mock.calls[0][0].temperature).toBe(0.3)
  })
})

describe('gradeResponses', () => {
  it('aggregates per-response scores into total/earned/percentage', async () => {
    mockChat.mockReturnValue(
      streamChunks([
        '[{"question_id":"q1","submitted":"A","correct":true,"score":1.0,"feedback":"yes"},{"question_id":"q2","submitted":"a defn","correct":false,"score":0.5,"feedback":"close"}]',
      ]),
    )
    const out = await gradeResponses({
      quiz: SAMPLE_QUIZ,
      responses: [
        { question_id: 'q1', submitted: 'A' },
        { question_id: 'q2', submitted: 'a defn' },
      ],
    })
    expect(out.total).toBe(2)
    expect(out.earned).toBe(1.5)
    expect(out.percentage).toBe(75) // round((1.5/2)*100)
    expect(out.responses).toHaveLength(2)
  })

  it('returns 0 percentage when quiz has no questions (avoid divide-by-zero)', async () => {
    mockChat.mockReturnValue(streamChunks(['[]']))
    const out = await gradeResponses({ quiz: { questions: [] }, responses: [] })
    expect(out.total).toBe(0)
    expect(out.percentage).toBe(0)
    expect(out.earned).toBe(0)
  })

  it('returns empty responses + 0 when AI returns malformed JSON', async () => {
    mockChat.mockReturnValue(streamChunks(['nope']))
    const out = await gradeResponses({
      quiz: SAMPLE_QUIZ,
      responses: [{ question_id: 'q1', submitted: 'A' }],
    })
    expect(out.responses).toEqual([])
    expect(out.earned).toBe(0)
    expect(out.percentage).toBe(0)
  })

  it('rounds earned to 2 decimal places', async () => {
    mockChat.mockReturnValue(
      streamChunks([
        '[{"question_id":"q1","submitted":"x","correct":false,"score":0.333},{"question_id":"q2","submitted":"y","correct":false,"score":0.334}]',
      ]),
    )
    const out = await gradeResponses({
      quiz: SAMPLE_QUIZ,
      responses: [
        { question_id: 'q1', submitted: 'x' },
        { question_id: 'q2', submitted: 'y' },
      ],
    })
    // 0.333 + 0.334 = 0.667 → rounds to 0.67
    expect(out.earned).toBe(0.67)
  })

  it('includes the answer key (without explanation) in the prompt', async () => {
    mockChat.mockReturnValue(streamChunks(['[]']))
    await gradeResponses({
      quiz: SAMPLE_QUIZ,
      responses: [{ question_id: 'q1', submitted: 'A' }],
    })
    const prompt = mockChat.mock.calls[0][0].messages[0].content
    expect(prompt).toContain('"id": "q1"')
    expect(prompt).toContain('"answer": "A"')
    expect(prompt).toContain('"type": "multiple_choice"')
  })

  it('treats missing score values as 0 (no NaN leakage)', async () => {
    mockChat.mockReturnValue(
      streamChunks(['[{"question_id":"q1","submitted":"A","correct":true}]']), // no score field
    )
    const out = await gradeResponses({
      quiz: SAMPLE_QUIZ,
      responses: [{ question_id: 'q1', submitted: 'A' }],
    })
    expect(out.earned).toBe(0)
    expect(Number.isNaN(out.percentage)).toBe(false)
  })
})

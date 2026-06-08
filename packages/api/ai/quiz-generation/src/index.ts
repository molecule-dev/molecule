/**
 * `@molecule/api-ai-quiz-generation` — generate quizzes from source
 * material + auto-grade student responses via the bonded AI provider.
 *
 * Extracted from ai-study-buddy flagship. For pure rule-based grading
 * (multiple-choice → exact match), use `@molecule/api-utilities-quiz-grading`.
 * This package adds AI-assisted generation + free-response grading.
 *
 * @example
 * ```ts
 * import { generateQuiz, gradeResponses } from '@molecule/api-ai-quiz-generation'
 *
 * const quiz = await generateQuiz({
 *   source: chapterText,
 *   questionCount: 10,
 *   types: ['multiple_choice', 'short_answer'],
 *   difficulty: 'medium',
 * })
 *
 * const result = await gradeResponses({
 *   quiz,
 *   responses: studentAnswers,
 * })
 * ```
 *
 * @module
 */

import { requireProvider as requireAI } from '@molecule/api-ai'

/** Union of supported quiz question formats. */
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_in_the_blank'
/** Relative difficulty level for a question or generated quiz. */
export type Difficulty = 'easy' | 'medium' | 'hard'

/** A single quiz question with prompt, answer, and optional metadata. */
export interface Question {
  id: string
  type: QuestionType
  prompt: string
  /** For multiple_choice / true_false. */
  options?: string[]
  /** The correct answer (or one of the accepted forms). */
  answer: string
  /** Why this is the right answer — surfaced after submission. */
  explanation?: string
  difficulty?: Difficulty
}

/** A generated quiz containing an ordered list of questions and an optional source summary. */
export interface Quiz {
  questions: Question[]
  source_summary?: string
}

/** AI-graded result for a single student response, including correctness, score, and feedback. */
export interface GradedResponse {
  question_id: string
  submitted: string
  correct: boolean
  score: number
  feedback?: string
}

/** Aggregated grading outcome for a full set of student responses. */
export interface GradeResult {
  responses: GradedResponse[]
  total: number
  earned: number
  percentage: number
}

/** Sends a single-turn chat prompt to the bonded AI provider and returns the full text response. */
async function callAI(prompt: string, model?: string, temperature = 0.3): Promise<string> {
  const ai = requireAI()
  let raw = ''
  for await (const event of ai.chat({
    messages: [{ role: 'user', content: prompt }],
    model,
    temperature,
  })) {
    const e = event as { type: string; text?: string }
    if (e.type === 'text') raw += e.text ?? ''
  }
  return raw
}

/** Strips optional markdown code fences from an AI response and parses the result as JSON, returning null on parse failure. */
function parseJson<T>(raw: string): T | null {
  try {
    const json = raw
      .replace(/```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()
    return JSON.parse(json) as T
  } catch (_error) {
    // Intentional noop: AI may return malformed or non-JSON output; callers handle the null return.
    return null
  }
}

const GENERATE_PROMPT = `Generate a quiz from the following source material.

Requirements:
- {{COUNT}} questions
- Question types: {{TYPES}}
- Difficulty: {{DIFFICULTY}}
- Each question must be answerable from the source

Return ONLY a JSON object:
{
  "source_summary": "1-2 sentence summary of the material",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "prompt": "...",
      "options": ["A", "B", "C", "D"],
      "answer": "B",
      "explanation": "...",
      "difficulty": "medium"
    }
  ]
}

Source:
{{SOURCE}}`

/** Generates a quiz from source material using the bonded AI provider, returning structured questions. */
export async function generateQuiz(opts: {
  source: string
  questionCount?: number
  types?: QuestionType[]
  difficulty?: Difficulty
  model?: string
}): Promise<Quiz> {
  const prompt = GENERATE_PROMPT.replace('{{COUNT}}', String(opts.questionCount ?? 5))
    .replace('{{TYPES}}', (opts.types ?? ['multiple_choice', 'short_answer']).join(', '))
    .replace('{{DIFFICULTY}}', opts.difficulty ?? 'medium')
    .replace('{{SOURCE}}', opts.source)
  const raw = await callAI(prompt, opts.model)
  const parsed = parseJson<Quiz>(raw)
  return parsed ?? { questions: [] }
}

const GRADE_PROMPT = `Grade these student responses against the answer key.

For each response:
- "correct" — boolean
- "score" — 0..1 (partial credit for short_answer if substantively correct but not exact)
- "feedback" — 1-2 sentences explaining the grade

Return ONLY a JSON array:
[{"question_id": "q1", "submitted": "...", "correct": true, "score": 1.0, "feedback": "..."}]

Answer key:
{{ANSWER_KEY}}

Student responses:
{{RESPONSES}}`

/** Grades a set of student responses against the quiz answer key using the bonded AI provider. */
export async function gradeResponses(opts: {
  quiz: Quiz
  responses: Array<{ question_id: string; submitted: string }>
  model?: string
}): Promise<GradeResult> {
  const answerKey = opts.quiz.questions.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    answer: q.answer,
    options: q.options,
  }))
  const prompt = GRADE_PROMPT.replace('{{ANSWER_KEY}}', JSON.stringify(answerKey, null, 2)).replace(
    '{{RESPONSES}}',
    JSON.stringify(opts.responses, null, 2),
  )
  const raw = await callAI(prompt, opts.model)
  const parsed = parseJson<GradedResponse[]>(raw) ?? []
  const total = opts.quiz.questions.length
  const earned = parsed.reduce((sum, r) => sum + (r.score ?? 0), 0)
  return {
    responses: parsed,
    total,
    earned: Math.round(earned * 100) / 100,
    percentage: total > 0 ? Math.round((earned / total) * 100) : 0,
  }
}

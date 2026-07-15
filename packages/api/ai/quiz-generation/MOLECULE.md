# @molecule/api-ai-quiz-generation

`@molecule/api-ai-quiz-generation` — generate quizzes from source
material + auto-grade student responses via the bonded AI provider.

Extracted from ai-study-buddy flagship. For pure rule-based grading
(multiple-choice → exact match), use `@molecule/api-utilities-quiz-grading`.
This package adds AI-assisted generation + free-response grading.

## Quick Start

```ts
import { generateQuiz, gradeResponses } from '@molecule/api-ai-quiz-generation'

const quiz = await generateQuiz({
  source: chapterText,
  questionCount: 10,
  types: ['multiple_choice', 'short_answer'],
  difficulty: 'medium',
})

const result = await gradeResponses({
  quiz,
  responses: studentAnswers,
})
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-ai-quiz-generation @molecule/api-ai @molecule/api-bonds-default-express @molecule/api-database @molecule/api-i18n @molecule/api-middleware-validation express zod
npm install -D @types/express
```

## API

### Interfaces

#### `GradedResponse`

AI-graded result for a single student response, including correctness, score, and feedback.

```typescript
interface GradedResponse {
  question_id: string
  submitted: string
  correct: boolean
  score: number
  feedback?: string
}
```

#### `GradeResult`

Aggregated grading outcome for a full set of student responses.

```typescript
interface GradeResult {
  responses: GradedResponse[]
  total: number
  earned: number
  percentage: number
}
```

#### `Question`

A single quiz question with prompt, answer, and optional metadata.

```typescript
interface Question {
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
```

#### `Quiz`

A generated quiz containing an ordered list of questions and an optional source summary.

```typescript
interface Quiz {
  questions: Question[]
  source_summary?: string
}
```

### Types

#### `Difficulty`

Relative difficulty level for a question or generated quiz.

```typescript
type Difficulty = 'easy' | 'medium' | 'hard'
```

#### `QuestionType`

```typescript
type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_in_the_blank'
```

### Functions

#### `generateQuiz(opts)`

Generates a quiz from source material using the bonded AI provider, returning structured questions.

```typescript
function generateQuiz(opts: { source: string; questionCount?: number; types?: QuestionType[]; difficulty?: Difficulty; model?: string; }): Promise<Quiz>
```

#### `gradeResponses(opts)`

Grades a set of student responses against the quiz answer key using the bonded AI provider.

```typescript
function gradeResponses(opts: { quiz: Quiz; responses: Array<{ question_id: string; submitted: string; }>; model?: string; }): Promise<GradeResult>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bonds-default-express` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-middleware-validation` ^1.0.0
- `express` ^5.0.0
- `zod` ^4.0.0
- `@molecule/api-ai` ^1.0.0

### Runtime Dependencies

- `@molecule/api-ai`
- `@molecule/api-bonds-default-express`
- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-middleware-validation`
- `express`
- `zod`

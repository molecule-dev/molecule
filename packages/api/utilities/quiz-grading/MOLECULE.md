# @molecule/api-quiz-grading

Pure-function multi-question-type grading engine for molecule.dev.

Supports six question kinds: `multi-choice` (single + multi-correct,
optional partial credit), `true-false`, `type-answer` (exact + fuzzy
Levenshtein with case/whitespace/accent normalisation), `fill-blank`
(per-blank partial credit), `numeric` (with tolerance), and
`matching` pairs (with partial credit). A multiplicative speed bonus
is applied when the caller supplies `elapsedMs` and the question
defines a `timeLimitMs`.

No I/O, no DB, no clock reads — every grading decision is a pure
function of `(question, answer, options)`. This keeps it equally
usable from API handlers, AI pipelines, mock-server fixtures, and
frontend test harnesses.

Used by lms, quiz-platform, language-learning, and any other app
that needs question-grading.

## Quick Start

```ts
import { gradeAnswer } from '@molecule/api-quiz-grading'

gradeAnswer(
  {
    kind: 'type-answer',
    payload: { acceptedAnswers: ['Paris'], match: { maxEditDistance: 1 } },
    points: 5,
  },
  'paris',
)
// → { is_correct: true, points_earned: 5, explanation: 'correct' }
```

```ts
import { gradeAnswer } from '@molecule/api-quiz-grading'

gradeAnswer(
  {
    kind: 'multi-choice',
    payload: { correctIndices: [0, 2], optionCount: 4, allowPartial: true },
    points: 10,
  },
  [0],
)
// → { is_correct: false, points_earned: 5, explanation: 'partial' }
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-quiz-grading zod
```

## API

### Interfaces

#### `AnswerMap`

Maps a {@link QuestionKind} to its accepted answer shape.

- `multi-choice`   — array of selected indices.
- `true-false`     — boolean.
- `type-answer`    — string.
- `fill-blank`     — string array (one entry per blank, in order).
- `numeric`        — number.
- `matching`       — `Record<leftId, rightId>`.

```typescript
interface AnswerMap {
  'multi-choice': number[]
  'true-false': boolean
  'type-answer': string
  'fill-blank': string[]
  numeric: number
  matching: Record<string, string>
}
```

#### `FillBlankPayload`

Payload for a fill-in-the-blank question (one or more blanks).

```typescript
interface FillBlankPayload {
  /** For each blank in order, the list of accepted answers for that blank. */
  blanks: Array<{ acceptedAnswers: string[] }>
  /** Normalisation options applied to every blank. */
  match?: TextMatchOptions
  /**
   * When `true`, each correctly-filled blank earns proportional partial
   * credit (1/N of the question's points). When `false`, all blanks must
   * be correct for any credit. Default: `true`.
   */
  allowPartial?: boolean
}
```

#### `FuzzyMatchOptions`

Fuzzy-match options for `type-answer` questions.

When `maxEditDistance > 0`, the grader accepts answers within the given
Levenshtein edit distance of any accepted answer. When omitted, only
exact (post-normalisation) matches are accepted.

```typescript
interface FuzzyMatchOptions extends TextMatchOptions {
  /** Maximum Levenshtein distance for a fuzzy match. 0 disables fuzzy matching. */
  maxEditDistance?: number
}
```

#### `GradedAnswer`

Intermediate scoring result emitted by every per-kind grader.

`fraction` is in `[0, 1]` and represents the share of `points` earned
before any speed bonus.

```typescript
interface GradedAnswer {
  /** Whether the answer is fully correct. */
  isCorrect: boolean
  /** Fraction of base points earned, in `[0, 1]`. */
  fraction: number
  /** Locale-independent explanation key. */
  explanation: string
}
```

#### `GradeOptions`

Optional inputs to the grader.

```typescript
interface GradeOptions {
  /**
   * Elapsed milliseconds spent on the question. When set together with
   * `question.timeLimitMs`, a multiplicative speed bonus is applied to
   * earned points using the formula:
   *
   * `speedFactor = 1 + speedBonusMaxFactor * max(0, 1 - elapsedMs/timeLimitMs)`
   *
   * Capped so `points_earned <= points * (1 + speedBonusMaxFactor)`.
   */
  elapsedMs?: number
  /**
   * Maximum extra fraction of `points` awarded for instant answers.
   * Default: 0.5 (i.e. up to +50% for a zero-elapsed answer).
   */
  speedBonusMaxFactor?: number
}
```

#### `GradeResult`

Result of grading a single question.

```typescript
interface GradeResult {
  /** `true` when the answer fully satisfies the question (no partial credit). */
  is_correct: boolean
  /**
   * Points awarded. In `[0, points * (1 + speedBonusMaxFactor)]`.
   * Partial-credit kinds may report a fractional value strictly between
   * 0 and the max.
   */
  points_earned: number
  /**
   * Stable, locale-independent explanation key (e.g. `'correct'`,
   * `'incorrect'`, `'partial'`, `'numeric.outOfTolerance'`). Consumers
   * who want a localised string should map this key through their own
   * i18n layer.
   */
  explanation?: string
}
```

#### `MatchingPayload`

Payload for a matching-pairs question.

```typescript
interface MatchingPayload {
  /**
   * The correct mapping. Keys are left-column ids, values are the
   * right-column id that should be paired with them.
   */
  pairs: Record<string, string>
  /**
   * When `true`, each correct pair earns proportional partial credit.
   * When `false`, all pairs must be correct. Default: `true`.
   */
  allowPartial?: boolean
}
```

#### `MultiChoicePayload`

Payload for a multi-choice question.

```typescript
interface MultiChoicePayload {
  /** Indices (0-based) into the option list that are correct. */
  correctIndices: number[]
  /**
   * When `true`, partial credit is awarded for selecting some-but-not-all
   * correct options (with a penalty for incorrect selections). Default: `false`.
   */
  allowPartial?: boolean
  /** Total option count — used to bound partial-credit denominators. */
  optionCount: number
}
```

#### `NumericPayload`

Payload for a numeric question with optional tolerance.

```typescript
interface NumericPayload {
  /** Expected numeric value. */
  correct: number
  /** Absolute tolerance — `|submitted - correct| <= tolerance` is correct. Default: 0. */
  tolerance?: number
}
```

#### `QuestionPayloadMap`

Maps a {@link QuestionKind} to its payload type.

```typescript
interface QuestionPayloadMap {
  'multi-choice': MultiChoicePayload
  'true-false': TrueFalsePayload
  'type-answer': TypeAnswerPayload
  'fill-blank': FillBlankPayload
  numeric: NumericPayload
  matching: MatchingPayload
}
```

#### `TextMatchOptions`

String-comparison normalisation flags used by text-based graders.

All flags default to `true` (i.e. forgiving comparison) when omitted.

```typescript
interface TextMatchOptions {
  /** Lowercase both sides before comparison. Default: `true`. */
  caseInsensitive?: boolean
  /** Strip leading/trailing whitespace. Default: `true`. */
  trim?: boolean
  /** Collapse internal whitespace to a single space. Default: `true`. */
  collapseWhitespace?: boolean
  /** Strip diacritics (NFD + remove combining marks). Default: `true`. */
  accentFold?: boolean
}
```

#### `TrueFalsePayload`

Payload for a true-false question.

```typescript
interface TrueFalsePayload {
  /** The correct boolean. */
  correct: boolean
}
```

#### `TypeAnswerPayload`

Payload for a free-text "type-answer" question.

```typescript
interface TypeAnswerPayload {
  /** All accepted spellings of the correct answer. */
  acceptedAnswers: string[]
  /** Normalisation + fuzzy-match options. */
  match?: FuzzyMatchOptions
}
```

### Types

#### `AnswerFor`

Per-kind answer type, keyed off the question's `kind`.

```typescript
type AnswerFor<Q extends Question> = AnswerMap[Q['kind']]
```

#### `Question`

A discriminated-union question shape. Use this as the canonical input
type for {@link gradeAnswer}.

```typescript
type Question = {
  [K in QuestionKind]: {
    /** Stable identifier, useful for caller-side bookkeeping. */
    id?: string
    /** Question kind discriminator. */
    kind: K
    /** Kind-specific payload. */
    payload: QuestionPayloadMap[K]
    /** Maximum points awardable. Default: 1. */
    points?: number
    /**
     * Time limit in milliseconds. When provided alongside
     * {@link GradeOptions.elapsedMs}, the speed-bonus formula is applied.
     */
    timeLimitMs?: number
  }
}[QuestionKind]
```

#### `QuestionKind`

Discriminator for the supported question kinds.

- `multi-choice`   — pick one or more correct options from a fixed list.
- `true-false`     — boolean answer.
- `type-answer`    — free-text response matched against accepted answers.
- `fill-blank`     — one or more blanks each with accepted answers.
- `numeric`        — numeric answer with optional tolerance.
- `matching`       — match items in column A to items in column B.

```typescript
type QuestionKind =
  | 'multi-choice'
  | 'true-false'
  | 'type-answer'
  | 'fill-blank'
  | 'numeric'
  | 'matching'
```

### Functions

#### `computeSpeedFactor(elapsedMs, timeLimitMs, maxFactor)`

Compute the multiplicative speed-bonus factor for an elapsed-time
answer. Returns `1` when no time data is provided.

Formula: `1 + maxFactor * max(0, 1 - elapsed/limit)` clamped so very
slow answers receive no bonus and over-budget answers also get `1`.

```typescript
function computeSpeedFactor(elapsedMs: number | undefined, timeLimitMs: number | undefined, maxFactor: number): number
```

- `elapsedMs` — Time spent on the question in ms.
- `timeLimitMs` — Question's time limit in ms.
- `maxFactor` — Maximum extra fraction (e.g. `0.5` ⇒ +50% bonus cap).

**Returns:** Multiplier in `[1, 1 + maxFactor]`.

#### `editDistance(a, b)`

Levenshtein edit distance between two strings.

Used by the `type-answer` grader for fuzzy matching. Implements the
standard two-row dynamic-programming algorithm — O(n*m) time, O(min(n,m))
space.

```typescript
function editDistance(a: string, b: string): number
```

- `a` — First string.
- `b` — Second string.

**Returns:** Number of single-character insertions, deletions, or substitutions required to turn `a` into `b`.

#### `gradeAnswer(question, answer, options)`

Grade a submitted answer against its question.

Pure function: the same input always returns the same output. No I/O,
no clock reads — pass `elapsedMs` explicitly when you want a speed
bonus.

```typescript
function gradeAnswer(question: Q, answer: AnswerFor<Q>, options?: GradeOptions): GradeResult
```

- `question` — The question + correct-answer payload.
- `answer` — The user's submitted answer (shape depends on kind).
- `options` — Optional speed-bonus inputs.

**Returns:** Grade result with `is_correct`, `points_earned`, `explanation`.

#### `gradeFillBlank(payload, answer)`

Grade a fill-in-the-blank question.

Each blank is graded independently. With `allowPartial` (default), the
earned fraction is `correctBlanks / totalBlanks`. Without it, the
grader returns full credit only when every blank matches.

```typescript
function gradeFillBlank(payload: FillBlankPayload, answer: string[]): GradedAnswer
```

- `payload` — Question payload.
- `answer` — Submitted strings, one per blank, in order.

**Returns:** Graded answer.

#### `gradeMatching(payload, answer)`

Grade a matching-pairs question.

Each correct pair earns `1/totalPairs`. With `allowPartial` (default),
partial credit is reported. Without it, the grader returns full
credit only when every pair matches.

```typescript
function gradeMatching(payload: MatchingPayload, answer: Record<string, string>): GradedAnswer
```

- `payload` — Question payload.
- `answer` — Submitted mapping `{ leftId: rightId }`.

**Returns:** Graded answer.

#### `gradeMultiChoice(payload, answer)`

Grade a multi-choice question.

- Single-correct: the answer must contain exactly the one correct index.
- Multi-correct (no partial): the selected set must equal the correct set.
- Multi-correct (with `allowPartial`): each correct selection earns
  `1/|correct|` and each incorrect selection deducts `1/(optionCount - |correct|)`,
  floored at zero. Awarded fraction is in `[0, 1]`.

```typescript
function gradeMultiChoice(payload: MultiChoicePayload, answer: number[]): GradedAnswer
```

- `payload` — Question payload.
- `answer` — Selected option indices (may contain duplicates / out-of-range — ignored).

**Returns:** Graded answer.

#### `gradeNumeric(payload, answer)`

Grade a numeric question with optional absolute tolerance.

```typescript
function gradeNumeric(payload: NumericPayload, answer: number): GradedAnswer
```

- `payload` — Question payload.
- `answer` — Submitted number.

**Returns:** Graded answer.

#### `gradeTrueFalse(payload, answer)`

Grade a true/false question.

```typescript
function gradeTrueFalse(payload: TrueFalsePayload, answer: boolean): GradedAnswer
```

- `payload` — Question payload.
- `answer` — Submitted boolean.

**Returns:** Graded answer.

#### `gradeTypeAnswer(payload, answer)`

Grade a free-text "type-answer" question.

The submitted string is normalised then compared (exactly or with
Levenshtein fuzzy match) against every accepted answer.

```typescript
function gradeTypeAnswer(payload: TypeAnswerPayload, answer: string): GradedAnswer
```

- `payload` — Question payload.
- `answer` — Submitted string.

**Returns:** Graded answer.

#### `normalizeText(value, options)`

Apply the requested normalisation steps to `value`. All flags default
to `true` (forgiving comparison).

```typescript
function normalizeText(value: string, options?: TextMatchOptions): string
```

- `value` — Raw string from the user / question payload.
- `options` — Override flags. Omitted flags default to `true`.

**Returns:** The normalised string.

### Constants

#### `fillBlankPayloadSchema`

Schema for a fill-blank payload.

```typescript
const fillBlankPayloadSchema: z.ZodObject<{ blanks: z.ZodArray<z.ZodObject<{ acceptedAnswers: z.ZodArray<z.ZodString>; }, z.core.$strict>>; match: z.ZodOptional<z.ZodObject<{ caseInsensitive: z.ZodOptional<z.ZodBoolean>; trim: z.ZodOptional<z.ZodBoolean>; collapseWhitespace: z.ZodOptional<z.ZodBoolean>; accentFold: z.ZodOptional<z.ZodBoolean>; }, z.core.$strict>>; allowPartial: z.ZodOptional<z.ZodBoolean>; }, z.core.$strict>
```

#### `fuzzyMatchOptionsSchema`

Schema for {@link FuzzyMatchOptions}.

```typescript
const fuzzyMatchOptionsSchema: z.ZodObject<{ caseInsensitive: z.ZodOptional<z.ZodBoolean>; trim: z.ZodOptional<z.ZodBoolean>; collapseWhitespace: z.ZodOptional<z.ZodBoolean>; accentFold: z.ZodOptional<z.ZodBoolean>; maxEditDistance: z.ZodOptional<z.ZodNumber>; }, z.core.$strict>
```

#### `gradeOptionsSchema`

Schema for {@link GradeOptions}.

```typescript
const gradeOptionsSchema: z.ZodObject<{ elapsedMs: z.ZodOptional<z.ZodNumber>; speedBonusMaxFactor: z.ZodOptional<z.ZodNumber>; }, z.core.$strict>
```

#### `gradeResultSchema`

Schema for {@link GradeResult}.

```typescript
const gradeResultSchema: z.ZodObject<{ is_correct: z.ZodBoolean; points_earned: z.ZodNumber; explanation: z.ZodOptional<z.ZodString>; }, z.core.$strict>
```

#### `matchingPayloadSchema`

Schema for a matching payload.

```typescript
const matchingPayloadSchema: z.ZodObject<{ pairs: z.ZodRecord<z.ZodString, z.ZodString>; allowPartial: z.ZodOptional<z.ZodBoolean>; }, z.core.$strict>
```

#### `multiChoicePayloadSchema`

Schema for a multi-choice payload.

```typescript
const multiChoicePayloadSchema: z.ZodObject<{ correctIndices: z.ZodArray<z.ZodNumber>; allowPartial: z.ZodOptional<z.ZodBoolean>; optionCount: z.ZodNumber; }, z.core.$strict>
```

#### `numericPayloadSchema`

Schema for a numeric payload.

```typescript
const numericPayloadSchema: z.ZodObject<{ correct: z.ZodNumber; tolerance: z.ZodOptional<z.ZodNumber>; }, z.core.$strict>
```

#### `questionSchema`

Discriminated-union schema for a {@link Question}. Use this to validate
questions read from untrusted JSON.

```typescript
const questionSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{ id: z.ZodOptional<z.ZodString>; kind: z.ZodLiteral<"multi-choice">; payload: z.ZodObject<{ correctIndices: z.ZodArray<z.ZodNumber>; allowPartial: z.ZodOptional<z.ZodBoolean>; optionCount: z.ZodNumber; }, z.core.$strict>; points: z.ZodOptional<z.ZodNumber>; timeLimitMs: z.ZodOptional<z.ZodNumber>; }, z.core.$strict>, z.ZodObject<{ id: z.ZodOptional<z.ZodString>; kind: z.ZodLiteral<"true-false">; payload: z.ZodObject<{ correct: z.ZodBoolean; }, z.core.$strict>; points: z.ZodOptional<z.ZodNumber>; timeLimitMs: z.ZodOptional<z.ZodNumber>; }, z.core.$strict>, z.ZodObject<{ id: z.ZodOptional<z.ZodString>; kind: z.ZodLiteral<"type-answer">; payload: z.ZodObject<{ acceptedAnswers: z.ZodArray<z.ZodString>; match: z.ZodOptional<z.ZodObject<{ caseInsensitive: z.ZodOptional<z.ZodBoolean>; trim: z.ZodOptional<z.ZodBoolean>; collapseWhitespace: z.ZodOptional<z.ZodBoolean>; accentFold: z.ZodOptional<z.ZodBoolean>; maxEditDistance: z.ZodOptional<z.ZodNumber>; }, z.core.$strict>>; }, z.core.$strict>; points: z.ZodOptional<z.ZodNumber>; timeLimitMs: z.ZodOptional<z.ZodNumber>; }, z.core.$strict>, z.ZodObject<{ id: z.ZodOptional<z.ZodString>; kind: z.ZodLiteral<"fill-blank">; payload: z.ZodObject<{ blanks: z.ZodArray<z.ZodObject<{ acceptedAnswers: z.ZodArray<z.ZodString>; }, z.core.$strict>>; match: z.ZodOptional<z.ZodObject<{ caseInsensitive: z.ZodOptional<z.ZodBoolean>; trim: z.ZodOptional<z.ZodBoolean>; collapseWhitespace: z.ZodOptional<z.ZodBoolean>; accentFold: z.ZodOptional<z.ZodBoolean>; }, z.core.$strict>>; allowPartial: z.ZodOptional<z.ZodBoolean>; }, z.core.$strict>; points: z.ZodOptional<z.ZodNumber>; timeLimitMs: z.ZodOptional<z.ZodNumber>; }, z.core.$strict>, z.ZodObject<{ id: z.ZodOptional<z.ZodString>; kind: z.ZodLiteral<"numeric">; payload: z.ZodObject<{ correct: z.ZodNumber; tolerance: z.ZodOptional<z.ZodNumber>; }, z.core.$strict>; points: z.ZodOptional<z.ZodNumber>; timeLimitMs: z.ZodOptional<z.ZodNumber>; }, z.core.$strict>, z.ZodObject<{ id: z.ZodOptional<z.ZodString>; kind: z.ZodLiteral<"matching">; payload: z.ZodObject<{ pairs: z.ZodRecord<z.ZodString, z.ZodString>; allowPartial: z.ZodOptional<z.ZodBoolean>; }, z.core.$strict>; points: z.ZodOptional<z.ZodNumber>; timeLimitMs: z.ZodOptional<z.ZodNumber>; }, z.core.$strict>], "kind">
```

#### `textMatchOptionsSchema`

Schema for {@link TextMatchOptions}.

```typescript
const textMatchOptionsSchema: z.ZodObject<{ caseInsensitive: z.ZodOptional<z.ZodBoolean>; trim: z.ZodOptional<z.ZodBoolean>; collapseWhitespace: z.ZodOptional<z.ZodBoolean>; accentFold: z.ZodOptional<z.ZodBoolean>; }, z.core.$strict>
```

#### `trueFalsePayloadSchema`

Schema for a true-false payload.

```typescript
const trueFalsePayloadSchema: z.ZodObject<{ correct: z.ZodBoolean; }, z.core.$strict>
```

#### `typeAnswerPayloadSchema`

Schema for a type-answer payload.

```typescript
const typeAnswerPayloadSchema: z.ZodObject<{ acceptedAnswers: z.ZodArray<z.ZodString>; match: z.ZodOptional<z.ZodObject<{ caseInsensitive: z.ZodOptional<z.ZodBoolean>; trim: z.ZodOptional<z.ZodBoolean>; collapseWhitespace: z.ZodOptional<z.ZodBoolean>; accentFold: z.ZodOptional<z.ZodBoolean>; maxEditDistance: z.ZodOptional<z.ZodNumber>; }, z.core.$strict>>; }, z.core.$strict>
```

## Injection Notes

### Runtime Dependencies

- `zod`

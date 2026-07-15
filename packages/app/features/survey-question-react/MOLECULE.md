# @molecule/app-survey-question-react

Multi-type survey-question renderer.

Exports:
- `<SurveyQuestion>` — single component that dispatches on `question.kind`.
- `SurveyQuestion` types — discriminated union covering 11 question kinds.

## Quick Start

```tsx
import { SurveyQuestion } from '@molecule/app-survey-question-react'
import type { SurveyQuestionDef, SurveyAnswerValue } from '@molecule/app-survey-question-react'
import { useState } from 'react'

const question: SurveyQuestionDef = {
  id: 'q1',
  kind: 'multi-choice-single',
  prompt: 'How satisfied are you?',
  required: true,
  options: [
    { value: 'very', label: 'Very satisfied' },
    { value: 'somewhat', label: 'Somewhat satisfied' },
    { value: 'not', label: 'Not satisfied' },
  ],
}

function MyForm() {
  const [answer, setAnswer] = useState<SurveyAnswerValue>()
  return <SurveyQuestion question={question} value={answer} onChange={setAnswer} onSubmit={(v) => console.log(v)} />
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-survey-question-react @molecule/app-file-dropzone-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `DateQuestion`

Date answer (rendered as a native date input).

```typescript
interface DateQuestion extends SurveyQuestionBase {
  kind: 'date'
  /** Optional minimum ISO date `yyyy-mm-dd`. */
  min?: string
  /** Optional maximum ISO date `yyyy-mm-dd`. */
  max?: string
}
```

#### `FileUploadQuestion`

File-upload question. The bond uses `<FileDropzone>` from `@molecule/app-file-dropzone-react`.

```typescript
interface FileUploadQuestion extends SurveyQuestionBase {
  kind: 'file-upload'
  /** Optional MIME / extension accept list (forwarded to the dropzone). */
  accept?: string
  /** Allow multiple files. */
  multiple?: boolean
  /** Maximum file size in bytes. */
  maxSize?: number
}
```

#### `LongTextQuestion`

Long multi-line free-text answer.

```typescript
interface LongTextQuestion extends SurveyQuestionBase {
  kind: 'long-text'
  /** Optional placeholder. */
  placeholder?: string
  /** Optional max character length. */
  maxLength?: number
  /** Number of textarea rows. Default: 4. */
  rows?: number
}
```

#### `MatrixQuestion`

Matrix question — sub-questions × shared answer options.

```typescript
interface MatrixQuestion extends SurveyQuestionBase {
  kind: 'matrix'
  /** Sub-question rows (each is its own prompt). */
  rows: Array<{ id: string; label: string }>
  /** Shared answer columns applied across every row. */
  columns: Array<{ value: string; label: string }>
}
```

#### `MultiChoiceMultiQuestion`

Multi-choice (multiple answers) — pick zero or more options.

```typescript
interface MultiChoiceMultiQuestion extends SurveyQuestionBase {
  kind: 'multi-choice-multi'
  /** Ordered list of options. */
  options: Array<{ value: string; label: string }>
}
```

#### `MultiChoiceSingleQuestion`

Multi-choice (single answer) — pick exactly one option.

```typescript
interface MultiChoiceSingleQuestion extends SurveyQuestionBase {
  kind: 'multi-choice-single'
  /** Ordered list of options. */
  options: Array<{ value: string; label: string }>
}
```

#### `NPSQuestion`

Net Promoter Score (0–10) question.

```typescript
interface NPSQuestion extends SurveyQuestionBase {
  kind: 'nps'
  /** Optional override for the "not likely" label (0). */
  lowLabel?: string
  /** Optional override for the "very likely" label (10). */
  highLabel?: string
}
```

#### `NumericQuestion`

Numeric answer with optional unit suffix.

```typescript
interface NumericQuestion extends SurveyQuestionBase {
  kind: 'numeric'
  /** Optional minimum value (inclusive). */
  min?: number
  /** Optional maximum value (inclusive). */
  max?: number
  /** Step increment for the numeric input. */
  step?: number
  /** Display-only unit shown after the input (e.g. "kg", "hours"). */
  unit?: string
}
```

#### `RatingScaleQuestion`

Rating scale (1–5 / 1–10 etc.) — single-pick from a numeric range.

```typescript
interface RatingScaleQuestion extends SurveyQuestionBase {
  kind: 'rating-scale'
  /** Lower bound of the scale (inclusive). Default: 1. */
  min?: number
  /** Upper bound of the scale (inclusive). Default: 5. */
  max?: number
  /** Optional label for the low end of the scale. */
  lowLabel?: string
  /** Optional label for the high end of the scale. */
  highLabel?: string
}
```

#### `ShortTextQuestion`

Short single-line free-text answer.

```typescript
interface ShortTextQuestion extends SurveyQuestionBase {
  kind: 'short-text'
  /** Optional placeholder. */
  placeholder?: string
  /** Optional max character length. */
  maxLength?: number
}
```

#### `SurveyAnswerMap`

Maps a {@link SurveyQuestionKind} to its accepted answer shape.

```typescript
interface SurveyAnswerMap {
  'multi-choice-single': string
  'multi-choice-multi': string[]
  'true-false': boolean
  'short-text': string
  'long-text': string
  numeric: number | ''
  'rating-scale': number
  nps: number
  date: string
  'file-upload': File[]
  matrix: Record<string, string>
}
```

#### `SurveyQuestionBase`

Common fields shared by every survey-question kind.

```typescript
interface SurveyQuestionBase {
  /** Stable identifier for caller bookkeeping. */
  id: string
  /** Question text shown to the respondent. */
  prompt: string
  /** Optional secondary description rendered under the prompt. */
  description?: string
  /** Optional hint shown beneath the input control. */
  helpText?: string
  /** Whether the respondent must answer this question. Default: false. */
  required?: boolean
}
```

#### `SurveyQuestionProps`

Props for the `<SurveyQuestion>` renderer.

```typescript
interface SurveyQuestionProps {
  /** Discriminated-union question payload — drives which sub-component is rendered. */
  question: SurveyQuestionDef
  /** Current answer value (kind-dependent shape). */
  value?: SurveyAnswerValue
  /** Called whenever the answer value changes. */
  onChange?: (value: SurveyAnswerValue) => void
  /** Called when the user clicks "Submit" — only fires when the answer passes required-field validation. */
  onSubmit?: (value: SurveyAnswerValue) => void
  /** When true, every input is disabled and no controls fire change events. */
  readOnly?: boolean
  /** Optional extra classes on the root wrapper. */
  className?: string
}
```

#### `TrueFalseQuestion`

Boolean true/false question.

```typescript
interface TrueFalseQuestion extends SurveyQuestionBase {
  kind: 'true-false'
  /** Optional override label for "true". Default uses i18n `surveyQuestion.trueFalse.true`. */
  trueLabel?: string
  /** Optional override label for "false". */
  falseLabel?: string
}
```

### Types

#### `SurveyAnswerFor`

Per-kind answer type.

```typescript
type SurveyAnswerFor<Q extends SurveyQuestionDef> = SurveyAnswerMap[Q['kind']]
```

#### `SurveyAnswerValue`

Generic value type accepted by `<SurveyQuestion>` regardless of kind.

```typescript
type SurveyAnswerValue = SurveyAnswerMap[SurveyQuestionKind]
```

#### `SurveyQuestionDef`

Discriminated-union question shape. Use this as the canonical input type
for `<SurveyQuestion>`. Named `SurveyQuestionDef` (rather than the bare
`SurveyQuestion`) so it doesn't collide with the exported component.

```typescript
type SurveyQuestionDef =
  | MultiChoiceSingleQuestion
  | MultiChoiceMultiQuestion
  | TrueFalseQuestion
  | ShortTextQuestion
  | LongTextQuestion
  | NumericQuestion
  | RatingScaleQuestion
  | NPSQuestion
  | DateQuestion
  | FileUploadQuestion
  | MatrixQuestion
```

#### `SurveyQuestionKind`

Discriminator for the supported survey question kinds.

```typescript
type SurveyQuestionKind =
  | 'multi-choice-single'
  | 'multi-choice-multi'
  | 'true-false'
  | 'short-text'
  | 'long-text'
  | 'numeric'
  | 'rating-scale'
  | 'nps'
  | 'date'
  | 'file-upload'
  | 'matrix'
```

### Functions

#### `SurveyQuestion(props)`

Multi-type survey question renderer. Discriminates on `question.kind` and
renders the matching sub-component for one of 11 supported kinds:

- `multi-choice-single`, `multi-choice-multi`
- `true-false`
- `short-text`, `long-text`
- `numeric` (with optional unit)
- `rating-scale` (configurable min/max, defaults to 1–5)
- `nps` (0–10)
- `date`
- `file-upload` (delegates to `<FileDropzone>`)
- `matrix` (sub-questions × shared options)

Required-field validation runs only on submit; `onChange` always fires.
All styling goes through `getClassMap()`. All UI text goes through `t()`
with English fallbacks; translations live in `@molecule/app-locales-survey-question`.

```typescript
function SurveyQuestion(props: SurveyQuestionProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props.

**Returns:** The question element.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-file-dropzone-react` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-file-dropzone-react`
- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`

## Translations

Translation strings are provided by `@molecule/app-locales-survey-question`.

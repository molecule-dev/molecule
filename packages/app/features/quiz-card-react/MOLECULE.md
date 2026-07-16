# @molecule/app-quiz-card-react

Quiz / multiple-choice question card.

Exports `<QuizCard>` and `QuizOption` type.

## Quick Start

```tsx
import { QuizCard } from '@molecule/app-quiz-card-react'

<QuizCard
  question="What is the capital of France?"
  options={[
    { id: 'a', label: 'London' },
    { id: 'b', label: 'Paris' },
    { id: 'c', label: 'Berlin' },
  ]}
  correctId="b"
  progress="1 / 10"
  explanation="Paris has been the capital of France since 987 AD."
  onAnswer={(id, correct) => console.log(id, correct)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-quiz-card-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `QuizCardProps`

Props for {@link QuizCard}.

```typescript
interface QuizCardProps {
  /** The question text. */
  question: ReactNode
  /** Answer options. */
  options: QuizOption[]
  /** Id of the correct option — when provided, the component reveals correct/incorrect on submit. */
  correctId?: string
  /** Called when the user submits an answer. */
  onAnswer?: (optionId: string, correct?: boolean) => void
  /** Progress display — e.g. `2 / 10`. */
  progress?: ReactNode
  /** Optional countdown / timer node above the question. */
  timer?: ReactNode
  /** Explanation shown after submit. */
  explanation?: ReactNode
  /** Extra classes. */
  className?: string
}
```

#### `QuizOption`

A single selectable answer option in a quiz question.

```typescript
interface QuizOption {
  id: string
  label: ReactNode
}
```

### Functions

#### `QuizCard(props)`

Single quiz question card with multiple-choice options. Tracks its
own submit state and reveals correct/incorrect when `correctId` is
provided.

```typescript
function QuizCard({
  question,
  options,
  correctId,
  onAnswer,
  progress,
  timer,
  explanation,
  className,
}: QuizCardProps): JSX.Element
```

- `props` — Component props (see {@link QuizCardProps}).

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`

Companion locale bond: `@molecule/app-locales-quiz-card` (`quizCard.submit`).
The card is single-shot: after submit the options lock and the explanation
replaces the button — there is no reset prop, so advance quizzes by
remounting with a fresh `key` per question. Without `correctId` no
correct/incorrect state is revealed and `onAnswer`'s second argument is
`undefined`. Requires the app-react i18n provider and a wired ClassMap bond.

## Translations

Translation strings are provided by `@molecule/app-locales-quiz-card`.

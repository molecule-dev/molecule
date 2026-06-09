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
npm install @molecule/app-quiz-card-react
```

## API

### Interfaces

#### `QuizOption`

A single selectable answer option in a quiz question.

```typescript
interface QuizOption {
  id: string
  label: ReactNode
}
```

### Functions

#### `QuizCard(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .question
- `root0` — .options
- `root0` — .correctId
- `root0` — .onAnswer
- `root0` — .progress
- `root0` — .timer
- `root0` — .explanation
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

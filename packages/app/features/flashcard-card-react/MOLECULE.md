# @molecule/app-flashcard-card-react

Flashcard study component.

Exports `<FlashcardCard>` and `SrsGrade` type.

## Quick Start

```tsx
import { FlashcardCard } from '@molecule/app-flashcard-card-react'

<FlashcardCard
  front={<span>What is the capital of France?</span>}
  back={<span>Paris</span>}
  progress="Card 3 of 20"
  onGrade={(grade) => scheduleNext(card.id, grade)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-flashcard-card-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

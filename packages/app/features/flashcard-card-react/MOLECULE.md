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

## API

### Types

#### `SrsGrade`

SM-2-compatible grade values the caller uses to schedule the next review.

```typescript
type SrsGrade = 'again' | 'hard' | 'good' | 'easy'
```

### Functions

#### `FlashcardCard(root0, root0, root0, root0, root0, root0, root0)`

Flashcard study component — front face → reveal back → SM-2 style
grade buttons (Again / Hard / Good / Easy). Apps own the
spaced-repetition scheduling logic.

```typescript
function FlashcardCard({
  front,
  back,
  onGrade,
  progress,
  defaultRevealed,
  className,
}: FlashcardCardProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `root0` — *
- `root0` — .front
- `root0` — .back
- `root0` — .onGrade
- `root0` — .progress
- `root0` — .defaultRevealed
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

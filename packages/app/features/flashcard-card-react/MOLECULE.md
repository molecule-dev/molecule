# @molecule/app-flashcard-card-react

Flashcard study card — shows the front (prompt), a "Show answer"
reveal button, then the back (answer) with four SM-2-compatible
grade buttons (Again / Hard / Good / Easy). The app owns the
spaced-repetition scheduling; the card only reports the grade.

Exports `<FlashcardCard>` and the `SrsGrade` type.

## Quick Start

```tsx
import { FlashcardCard } from '@molecule/app-flashcard-card-react'

function StudyView() {
  return (
    <FlashcardCard
      front={<span>What is the capital of France?</span>}
      back={<span>Paris</span>}
      progress="Card 3 of 20"
      onGrade={(grade) => scheduleNext(card.id, grade)}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-flashcard-card-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `FlashcardCardProps`

```typescript
interface FlashcardCardProps {
  /** Front content (prompt). */
  front: ReactNode
  /** Back content (answer). */
  back: ReactNode
  /** Called when the user grades the card after revealing the answer. */
  onGrade?: (grade: SrsGrade) => void
  /** Optional progress / position. */
  progress?: ReactNode
  /** Initially show the answer. */
  defaultRevealed?: boolean
  /** Extra classes. */
  className?: string
}
```

### Types

#### `SrsGrade`

SM-2-compatible grade values the caller uses to schedule the next review.

```typescript
type SrsGrade = 'again' | 'hard' | 'good' | 'easy'
```

### Functions

#### `FlashcardCard(props)`

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

- `props` — Component props (see {@link FlashcardCardProps}).

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

Grading flips the card back to its FRONT face (ready for the next
card) — swap the `front` / `back` props to advance the deck after
`onGrade` fires. There is no flip animation; the reveal is an
instant content swap.

Renders with the `Card` / `Button` primitives from the
`@molecule/app-ui-react` peer dependency. Button labels translate
via `@molecule/app-locales-flashcard-card` with English fallbacks
inline.

## Translations

Translation strings are provided by `@molecule/app-locales-flashcard-card`.

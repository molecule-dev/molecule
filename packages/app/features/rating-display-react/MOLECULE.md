# @molecule/app-rating-display-react

React star-rating display.

Exports `<RatingDisplay>` — fractional star rendering (inline SVG),
optional review count tail, optional interactive mode via `onChange`.

## Quick Start

```tsx
import { useState } from 'react'
import { RatingDisplay } from '@molecule/app-rating-display-react'

function ProductRating() {
  const [rating, setRating] = useState(0)
  const scrollToReviews = (): void => {
    document.getElementById('reviews')?.scrollIntoView()
  }
  // First: read-only with review count. Second: interactive — user picks a rating.
  return (
    <>
      <RatingDisplay value={4.5} reviewCount={128} onReviewsClick={scrollToReviews} />
      <RatingDisplay value={rating} size="lg" onChange={(v) => setRating(v)} />
    </>
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-rating-display-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `RatingDisplayProps`

Props for {@link RatingDisplay}.

```typescript
interface RatingDisplayProps {
  /** Rating value (0–max). Fractional supported. */
  value: number
  /** Maximum rating. Defaults to 5. */
  max?: number
  /** Optional review count shown after the stars. */
  reviewCount?: number
  /** Called when the review-count is clicked (renders it as a button). */
  onReviewsClick?: () => void
  /** Size preset. */
  size?: 'sm' | 'md' | 'lg'
  /** Interactive mode — star clicks call `onChange(starIndex + 1)`. */
  onChange?: (value: number) => void
  /** Accessible label override. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `RatingDisplay(props)`

Star-rating display supporting fractional values and an optional
review-count tail. When `onChange` is provided each star becomes an
interactive button.

Uses inline SVG stars so the component works without icon-font fallback.

```typescript
function RatingDisplay({
  value,
  max = 5,
  reviewCount,
  onReviewsClick,
  size = 'md',
  onChange,
  ariaLabel,
  className,
}: RatingDisplayProps): JSX.Element
```

- `props` — Component props (see {@link RatingDisplayProps}).

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

Stars are inline SVG filled with `currentColor` — set a text color on the
wrapper (e.g. a warning/amber token) to tint them; unfilled portions render
at 25% opacity of the same color. Accessibility labels are English defaults:
the container label is overridable via `ariaLabel`, but the per-star "Rate N
of M" button labels in interactive mode are not — this package has no locale
bond. Requires a wired ClassMap bond.

# @molecule/app-rating-display-react

React star-rating display.

Exports `<RatingDisplay>` — fractional star rendering (inline SVG),
optional review count tail, optional interactive mode via `onChange`.

## Quick Start

```tsx
import { RatingDisplay } from '@molecule/app-rating-display-react'

// Read-only with review count
<RatingDisplay value={4.5} reviewCount={128} onReviewsClick={() => scrollToReviews()} />

// Interactive — user picks a rating
<RatingDisplay value={rating} size="lg" onChange={(v) => setRating(v)} />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-rating-display-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

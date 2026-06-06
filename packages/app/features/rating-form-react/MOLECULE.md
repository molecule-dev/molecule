# @molecule/app-rating-form-react

Interactive star-rating + comment form.

Exports `<RatingForm>`.

## Quick Start

```tsx
import { RatingForm } from '@molecule/app-rating-form-react'

<RatingForm
  title="Leave a review"
  onSubmit={async (rating, comment) => {
    await submitReview({ rating, comment })
  }}
  requireComment={false}
  submitLabel="Submit review"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-rating-form-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

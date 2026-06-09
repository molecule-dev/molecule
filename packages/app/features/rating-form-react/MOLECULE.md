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

## API

### Functions

#### `RatingForm(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Interactive star-rating + comment form. Used for review submission
(product reviews, course feedback, support-ticket CSAT).

```typescript
function RatingForm({
  onSubmit,
  max = 5,
  defaultRating = 0,
  requireComment,
  title,
  commentPlaceholder,
  submitLabel,
  className,
}: RatingFormProps): JSX.Element
```

- `root0` — *
- `root0` — .onSubmit
- `root0` — .max
- `root0` — .defaultRating
- `root0` — .requireComment
- `root0` — .title
- `root0` — .commentPlaceholder
- `root0` — .submitLabel
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

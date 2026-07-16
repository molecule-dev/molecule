# @molecule/app-rating-form-react

Interactive star-rating + comment form.

Exports `<RatingForm>`.

## Quick Start

```tsx
import { RatingForm } from '@molecule/app-rating-form-react'

const submitReview = async (review: { rating: number; comment: string }): Promise<void> => {
  await fetch('/api/reviews', { method: 'POST', body: JSON.stringify(review) })
}

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
npm install @molecule/app-rating-form-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `RatingFormProps`

Props for {@link RatingForm}.

```typescript
interface RatingFormProps {
  /** Called with the submitted rating + optional comment. */
  onSubmit: (rating: number, comment: string) => void | Promise<void>
  /** Maximum stars. Defaults to 5. */
  max?: number
  /** Initial rating (uncontrolled). */
  defaultRating?: number
  /** Whether a comment is required. Defaults to false. */
  requireComment?: boolean
  /** Form heading. */
  title?: ReactNode
  /** Comment placeholder. */
  commentPlaceholder?: string
  /** Submit-button label. */
  submitLabel?: ReactNode
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `RatingForm(props)`

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

- `props` — Component props (see {@link RatingFormProps}).

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

Companion locale bond: `@molecule/app-locales-rating-form`. The submit button
stays disabled until a star rating is selected, and `requireComment` blocks
submission on blank comments silently (no inline error is rendered). Rejected
`onSubmit` promises propagate — handle errors in your handler. Requires the
app-react i18n provider and a wired ClassMap bond.

## Translations

Translation strings are provided by `@molecule/app-locales-rating-form`.

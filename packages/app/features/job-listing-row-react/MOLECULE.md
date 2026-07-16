# @molecule/app-job-listing-row-react

Job-board listing row — title + company + location + employment type +
salary + posted date, with optional leading logo, tag chips, and
right-side actions.

Exports `<JobListingRow>`. Props: `title`, `company?`, `location?`, `type?`,
`salary?`, `postedAt?`, `leading?`, `tags?`, `actions?`, `onClick?`, `className?`.
All display props accept ReactNode, so formatting (dates, currency) is the
caller's job.

## Quick Start

```tsx
import { JobListingRow } from '@molecule/app-job-listing-row-react'

<JobListingRow
  title="Senior Frontend Engineer"
  company="Acme Corp"
  location="Remote · US"
  type="Full-time"
  salary="$130k–$160k"
  postedAt="2 days ago"
  onClick={() => { window.location.href = '/jobs/123' }}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-job-listing-row-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `JobListingRowProps`

```typescript
interface JobListingRowProps {
  title: ReactNode
  /** Company / employer display. */
  company?: ReactNode
  /** Location string ("Remote · US" / "London, UK"). */
  location?: ReactNode
  /** Employment type ("Full-time", "Contract", "Internship"). */
  type?: ReactNode
  /** Salary range display ("$80k–$120k"). */
  salary?: ReactNode
  /** Posted-at relative or absolute display. */
  postedAt?: ReactNode
  /** Optional company logo / icon. */
  leading?: ReactNode
  /** Optional right-side actions (Save, Apply). */
  actions?: ReactNode
  /** Tags / chips (Remote, React, Hybrid). */
  tags?: ReactNode
  /** Click handler on the row. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `JobListingRow(props)`

Job-board row — title + company + location + type + salary + posted
date with optional tags and right-side actions.

```typescript
function JobListingRow({
  title,
  company,
  location,
  type,
  salary,
  postedAt,
  leading,
  actions,
  tags,
  onClick,
  className,
}: JobListingRowProps): JSX.Element
```

- `props` — Component props (see {@link JobListingRowProps}).

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

- The location value is prefixed with a hardcoded 📍 glyph and the meta fields
  are joined with literal middle-dot separators; there is no prop to change or
  localise those separators.
- `onClick` makes the whole row clickable but the root is a plain `<div>` with no
  `role`, `tabIndex`, or keyboard handler — keyboard users can only reach whatever
  you pass in `actions`. Put a real link or button in `actions` when the row is
  the primary navigation affordance.
- No `data-mol-id` prop is currently supported on this component.
- Styling resolves through `getClassMap()` — a ClassMap bond must be wired.

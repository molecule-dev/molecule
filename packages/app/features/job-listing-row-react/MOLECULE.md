# @molecule/app-job-listing-row-react

Job-board listing row.

Exports `<JobListingRow>`.

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
  onClick={() => openJob(job.id)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-job-listing-row-react
```

## API

### Functions

#### `JobListingRow(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .title
- `root0` — .company
- `root0` — .location
- `root0` — .type
- `root0` — .salary
- `root0` — .postedAt
- `root0` — .leading
- `root0` — .actions
- `root0` — .tags
- `root0` — .onClick
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

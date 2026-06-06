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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

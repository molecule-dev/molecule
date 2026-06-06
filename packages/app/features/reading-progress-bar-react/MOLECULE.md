# @molecule/app-reading-progress-bar-react

React reading progress bar.

Exports `<ReadingProgressBar>` — a thin top-of-page bar that fills as the
user scrolls through an article. Used by blog and news-aggregator
article pages.

## Quick Start

```tsx
import { useRef } from 'react'
import { ReadingProgressBar } from '@molecule/app-reading-progress-bar-react'

const articleRef = useRef<HTMLElement>(null)

// Pin to top, track a specific article element
<ReadingProgressBar containerRef={articleRef} color="var(--brand)" thickness={4} />

// Simpler: track whole-page scroll
<ReadingProgressBar position="top" />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-reading-progress-bar-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-reading-progress-bar`.

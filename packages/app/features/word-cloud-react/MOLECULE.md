# @molecule/app-word-cloud-react

Word cloud visualization with hand-rolled spiral packing. SVG-based, no
library dependency, configurable size / palette / orientation,
accessible per-word `aria-label`-via-text and `data-mol-id` attributes.

Used by voting-polling (the `wordcloud` question type) and reusable for
survey results, news-topic clouds, tag analytics, and any "weighted
vocabulary" visualization.

## Quick Start

```tsx
import { WordCloud } from '@molecule/app-word-cloud-react'

<WordCloud
  words={[
    { text: 'molecule', value: 42 },
    { text: 'react', value: 30 },
    { text: 'svg', value: 18 },
  ]}
  onWordClick={(w) => console.log(w.text, w.value)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-word-cloud-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

All UI text routes through `t('word-cloud.*')` from
`@molecule/app-react`'s `useTranslation()`. Drop in
`@molecule/app-locales-word-cloud` for translated aria labels.

The pure helper `packWords()` is exported for testing and for reuse by
non-React renderers (canvas, native, server-side).

## Translations

Translation strings are provided by `@molecule/app-locales-word-cloud`.

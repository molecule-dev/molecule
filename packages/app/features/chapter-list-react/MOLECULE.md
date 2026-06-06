# @molecule/app-feature-chapter-list-react

Chapter list — scrollable list of chapters with seek-to-on-click and a
progress highlight for the chapter the playhead is currently inside.

Used by podcast and video-streaming surfaces for in-episode chapter
navigation.

## Quick Start

```tsx
import { ChapterList } from '@molecule/app-feature-chapter-list-react'

<ChapterList
  chapters={[
    { id: 'c1', title: 'Intro', startTime: 0 },
    { id: 'c2', title: 'Topic A', startTime: 120, thumbnail: '/a.jpg' },
    { id: 'c3', title: 'Outro', startTime: 1800 },
  ]}
  currentTime={150}
  onSeek={(s) => audio.currentTime = s}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-feature-chapter-list-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-feature-chapter-list-react`.

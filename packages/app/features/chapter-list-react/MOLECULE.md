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

## API

### Interfaces

#### `Chapter`

A single chapter entry inside an episode / video / podcast track.
`id` is used as a stable React key, `startTime` is in seconds and
drives both the displayed timestamp and the `currentTime`-based
highlight. `thumbnail` is an optional small image (square) shown to
the left of the title.

```typescript
interface Chapter {
  /** Stable identifier for the chapter (used as a React key). */
  id: string
  /** Chapter title shown as the primary label of the row. */
  title: string
  /** Chapter start time in seconds (used for sorting + seek + highlight). */
  startTime: number
  /** Optional thumbnail image URL (square). */
  thumbnail?: string
}
```

#### `ChapterListProps`

Chapter-list component props.

```typescript
interface ChapterListProps {
  /**
   * Chapters to render. Order is preserved as-is (callers should pass
   * them in `startTime` order). The "current" chapter is the last one
   * whose `startTime` is `<= currentTime`.
   */
  chapters: Chapter[]
  /**
   * Current playback time in seconds. The chapter whose `startTime` is
   * the largest value `<= currentTime` is highlighted as the active
   * chapter. Pass `0` if playback hasn't started yet.
   */
  currentTime: number
  /**
   * Optional click handler called with the chapter's `startTime` when a
   * row is activated. When omitted the rows render as static, non-
   * interactive elements.
   */
  onSeek?: (startTime: number) => void
  /** Extra classes merged onto the root element. */
  className?: string
  /** Optional trailing slot rendered at the right edge of each row (e.g. download button). */
  rowTrailing?: (chapter: Chapter) => ReactNode
}
```

### Functions

#### `ChapterList(props)`

Scrollable list of chapters with seek-to-on-click and a progress
highlight for the chapter the playhead is currently inside. Used by
podcast and video-streaming surfaces for in-episode chapter
navigation. Each row shows an optional small thumbnail, the chapter
title, and the timestamp.

All styling routes through `getClassMap()` (no Tailwind / raw class
names). All user-visible text routes through `t()` so the list
translates via the companion
`@molecule/app-locales-feature-chapter-list` locale bond.

```typescript
function ChapterList(props: ChapterListProps): ReactNode
```

- `props` — Component props.

**Returns:** The chapter-list element.

#### `findActiveChapterIndex(chapters, currentTime)`

Find the index of the active chapter for a given `currentTime`.
Returns the index of the last chapter whose `startTime` is `<=
currentTime`. Returns `-1` when `chapters` is empty or `currentTime`
is before the first chapter.

```typescript
function findActiveChapterIndex(chapters: Chapter[], currentTime: number): number
```

- `chapters` — Chapters in start-time order.
- `currentTime` — Current playback time in seconds.

**Returns:** The active chapter index, or `-1`.

#### `formatTimestamp(seconds)`

Format a number of seconds as `m:ss` or `h:mm:ss` (or `0:00` for
non-finite / negative input). Used for chapter timestamps.

```typescript
function formatTimestamp(seconds: number): string
```

- `seconds` — Seconds to format.

**Returns:** The formatted timestamp string.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-feature-chapter-list`.

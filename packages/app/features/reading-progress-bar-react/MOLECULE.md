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
npm install @molecule/app-reading-progress-bar-react @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `ReadingProgressBarProps`

Props for the {@link ReadingProgressBar} component.

```typescript
interface ReadingProgressBarProps {
  /**
   * Optional ref to the article element. When provided, progress is
   * measured against that element's bounding rect (so the bar fills as the
   * user scrolls through the article body, not the whole page). When
   * omitted, progress falls back to `window` scroll position.
   */
  containerRef?: RefObject<Element | null>
  /** Bar thickness in pixels. Defaults to `3`. */
  thickness?: number
  /**
   * Where the bar pins. Defaults to `'top'`. Both variants render fixed
   * across the full viewport width with a high z-index.
   */
  position?: 'top' | 'bottom'
  /**
   * CSS color for the filled portion of the bar. Defaults to
   * `'currentColor'` so the bar inherits whatever text color is in scope —
   * letting the surrounding theme drive it. Pass an explicit color
   * (`'#3b82f6'`, `'var(--brand)'`, etc.) to override.
   */
  color?: string
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent / E2E selectors. */
  dataMolId?: string
}
```

### Functions

#### `computeArticleProgress(el, viewportHeight)`

Computes the scroll progress (0..1) of an element, measured by how much of
the element has scrolled past the top of the viewport.

Specifically:
- Returns `0` when the element's top is at or below the viewport top.
- Returns `1` when the element's bottom is at or above the viewport top
  plus the viewport height (i.e. the element has been fully read).
- Linearly interpolates between those endpoints in the middle.

The same formula works whether the user reads inside `window` (no
`containerRef`) or scrolls a fixed element — the bounding rect already
accounts for the layout.

```typescript
function computeArticleProgress(el: Element, viewportHeight: number): number
```

- `el` — The article element whose read-through progress we want.
- `viewportHeight` — The viewport height to use as the denominator.

**Returns:** A number in `[0, 1]`.

#### `computeWindowProgress()`

Computes window scroll progress (0..1) using `scrollY` and the document's
total scrollable height.

```typescript
function computeWindowProgress(): number
```

**Returns:** A number in `[0, 1]`. Falls back to `0` when there is nothing to
 *   scroll (page shorter than the viewport).

#### `ReadingProgressBar(props)`

Top-of-page reading progress bar.

Tracks how far the user has scrolled through an article and renders a
thin horizontal bar pinned to the top (or bottom) of the viewport,
filling left-to-right from 0% to 100% as they read.

Throttles scroll updates with `requestAnimationFrame` so the work runs
at most once per frame — handler attaches in passive mode.

Listens to both `scroll` and `resize` because progress changes when the
viewport height changes (e.g. mobile toolbar collapse).

No `containerRef` → measures `window`. With `containerRef` → measures
the element so the bar reflects progress through that specific article
even when the page has additional scrollable content above/below.

```typescript
function ReadingProgressBar({
  containerRef,
  thickness = 3,
  position = 'top',
  color,
  className,
  dataMolId,
}: ReadingProgressBarProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props (see {@link ReadingProgressBarProps}).

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `react`

Companion locale bond: `@molecule/app-locales-reading-progress-bar` (the
progressbar aria-label). The fill defaults to `currentColor` — it inherits
the surrounding text color, so pass `color` (e.g. `var(--color-primary)`)
when the ambient text color is low-contrast against the page edge. The bar
renders `position: fixed` at `z-index: 1000` spanning the viewport width;
it only listens to `window` scroll — `containerRef` changes what is
measured, not which scroller is observed (inner scroll containers won't
drive it). Requires the app-react i18n provider and a wired ClassMap bond.

## Translations

Translation strings are provided by `@molecule/app-locales-reading-progress-bar`.

/**
 * React reading progress bar.
 *
 * Exports `<ReadingProgressBar>` — a thin top-of-page bar that fills as the
 * user scrolls through an article. Used by blog and news-aggregator
 * article pages.
 *
 * @example
 * ```tsx
 * import { useRef } from 'react'
 * import { ReadingProgressBar } from '@molecule/app-reading-progress-bar-react'
 *
 * const articleRef = useRef<HTMLElement>(null)
 *
 * // Pin to top, track a specific article element
 * <ReadingProgressBar containerRef={articleRef} color="var(--brand)" thickness={4} />
 *
 * // Simpler: track whole-page scroll
 * <ReadingProgressBar position="top" />
 * ```
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-reading-progress-bar` (the
 * progressbar aria-label). The fill defaults to `currentColor` — it inherits
 * the surrounding text color, so pass `color` (e.g. `var(--color-primary)`)
 * when the ambient text color is low-contrast against the page edge. The bar
 * renders `position: fixed` at `z-index: 1000` spanning the viewport width;
 * it only listens to `window` scroll — `containerRef` changes what is
 * measured, not which scroller is observed (inner scroll containers won't
 * drive it). Requires the app-react i18n provider and a wired ClassMap bond.
 *
 * @module
 */

export * from './ReadingProgressBar.js'

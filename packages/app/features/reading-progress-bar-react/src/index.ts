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
 * @module
 */

export * from './ReadingProgressBar.js'

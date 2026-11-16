/**
 * Svelte reading progress bar.
 *
 * Exports `ReadingProgressBar` — a thin top-of-page bar that fills as the user
 * scrolls through an article. Used by blog and news-aggregator article pages.
 * It is the Svelte counterpart of `@molecule/app-reading-progress-bar-react`:
 * same export names, same props, same DOM for the same input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { ReadingProgressBar } from '@molecule/app-reading-progress-bar-svelte'
 *
 *   let article: HTMLElement | undefined = $state()
 *   // `containerRef={{ get current() { return article ?? null } }}` pins to the
 *   // article; without containerRef the bar tracks whole-page scroll.
 * </script>
 *
 * <ReadingProgressBar
 *   containerRef={{ get current() { return article ?? null } }}
 *   color="var(--brand)"
 *   thickness={4}
 * />
 * <article bind:this={article}>…long read…</article>
 * ```
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-reading-progress-bar` (the
 * progressbar aria-label). The fill defaults to `currentColor` — it inherits
 * the surrounding text color, so pass `color` (e.g. `var(--color-primary)`)
 * when the ambient text color is low-contrast against the page edge. The bar
 * renders `position: fixed` at `z-index: 1000` spanning the viewport width; it
 * only listens to `window` scroll — `containerRef` changes what is measured,
 * not which scroller is observed (inner scroll containers won't drive it).
 * Requires the Svelte binding's i18n provider and a wired ClassMap bond.
 *
 * @module
 */

export * from './components.js'
export * from './progress.js'
export * from './types.js'

/**
 * Angular reading progress bar — the counterpart of
 * `@molecule/app-reading-progress-bar-react`: the same export names, the same
 * props and the same DOM for the same input.
 *
 * Exports `<ReadingProgressBar>` — a thin bar pinned to the viewport edge that
 * fills as the user scrolls through an article. Used by blog and
 * news-aggregator article pages.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { ReadingProgressBar } from '@molecule/app-reading-progress-bar-angular'
 *
 * @Component({
 *   selector: 'app-article',
 *   standalone: true,
 *   imports: [ReadingProgressBar],
 *   template: `
 *     <div mol-reading-progress-bar [containerRef]="articleRef" color="var(--brand)" thickness="4"></div>
 *     <article #articleRef>…long read…</article>
 *   `,
 * })
 * export class Article {}
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
 * Requires the Angular binding's i18n provider and a wired ClassMap bond.
 *
 * @module
 */

export * from './progress.js'
export * from './reading-progress-bar.component.js'
export * from './types.js'

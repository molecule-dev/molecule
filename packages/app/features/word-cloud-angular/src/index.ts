/**
 * Word cloud visualization with hand-rolled spiral packing. SVG-based, no
 * library dependency, configurable size / palette / orientation, accessible
 * per-word `data-mol-id` attributes.
 *
 * Angular counterpart of `@molecule/app-word-cloud-react`: the same props
 * (React names) and the same DOM for the same input, so an app switches
 * framework by changing only the package name in its imports.
 *
 * Used by voting-polling (the `wordcloud` question type) and reusable for
 * survey results, news-topic clouds, tag analytics, and any "weighted
 * vocabulary" visualization.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { WordCloud } from '@molecule/app-word-cloud-angular'
 *
 * @Component({
 *   selector: 'app-topics',
 *   standalone: true,
 *   imports: [WordCloud],
 *   template: `
 *     <svg mol-word-cloud [words]="words" [onWordClick]="log"></svg>
 *   `,
 * })
 * export class Topics {
 *   words = [
 *     { text: 'molecule', value: 42 },
 *     { text: 'angular', value: 30 },
 *     { text: 'svg', value: 18 },
 *   ]
 *
 *   readonly log = (word: { text: string }): void => console.log(word.text)
 * }
 * ```
 *
 * @remarks
 * All UI text routes through `t('word-cloud.*')` from
 * `@molecule/app-angular`'s `useTranslation()`. Drop in
 * `@molecule/app-locales-word-cloud` for translated aria labels.
 *
 * The pure helpers (`estimateBBox`, `bboxesIntersect`, `scaleFontSize`,
 * `packWords`) are exported for testing and for reuse by non-Angular renderers
 * (canvas, native, server-side).
 *
 * @module
 */

export * from './packing.js'
export * from './types.js'
export * from './word-cloud.component.js'

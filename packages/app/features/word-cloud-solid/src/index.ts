/**
 * Word cloud visualization with hand-rolled spiral packing. SVG-based, no
 * library dependency, configurable size / palette / orientation, accessible
 * per-word `data-mol-id` attributes.
 *
 * Solid counterpart of `@molecule/app-word-cloud-react`: the same props (React
 * names) and the same DOM for the same input, so an app switches framework by
 * changing only the package name in its imports.
 *
 * Used by voting-polling (the `wordcloud` question type) and reusable for
 * survey results, news-topic clouds, tag analytics, and any "weighted
 * vocabulary" visualization.
 *
 * @example
 * ```tsx
 * import { WordCloud } from '@molecule/app-word-cloud-solid'
 *
 * export function Topics() {
 *   return (
 *     <WordCloud
 *       words={[
 *         { text: 'molecule', value: 42 },
 *         { text: 'solid', value: 30 },
 *         { text: 'svg', value: 18 },
 *       ]}
 *       onWordClick={(w) => console.log(w.text, w.value)}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * All UI text routes through `t('word-cloud.*')` from
 * `@molecule/app-solid`'s `useTranslation()`. Drop in
 * `@molecule/app-locales-word-cloud` for translated aria labels.
 *
 * The pure helpers (`estimateBBox`, `bboxesIntersect`, `scaleFontSize`,
 * `packWords`) are exported for testing and for reuse by non-Solid renderers
 * (canvas, native, server-side).
 *
 * @module
 */

export * from './types.js'
export * from './WordCloud.jsx'

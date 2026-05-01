/**
 * Word cloud visualization with hand-rolled spiral packing. SVG-based, no
 * library dependency, configurable size / palette / orientation,
 * accessible per-word `aria-label`-via-text and `data-mol-id` attributes.
 *
 * Used by voting-polling (the `wordcloud` question type) and reusable for
 * survey results, news-topic clouds, tag analytics, and any "weighted
 * vocabulary" visualization.
 *
 * @example
 * ```tsx
 * import { WordCloud } from '@molecule/app-word-cloud-react'
 *
 * <WordCloud
 *   words={[
 *     { text: 'molecule', value: 42 },
 *     { text: 'react', value: 30 },
 *     { text: 'svg', value: 18 },
 *   ]}
 *   onWordClick={(w) => console.log(w.text, w.value)}
 * />
 * ```
 *
 * @remarks
 * All UI text routes through `t('word-cloud.*')` from
 * `@molecule/app-react`'s `useTranslation()`. Drop in
 * `@molecule/app-locales-word-cloud-react` for translated aria labels.
 *
 * The pure helper `packWords()` is exported for testing and for reuse by
 * non-React renderers (canvas, native, server-side).
 *
 * @module
 */

export * from './WordCloud.js'

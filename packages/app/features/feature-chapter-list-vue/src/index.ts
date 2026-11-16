/**
 * Vue chapter list — scrollable list of chapters with seek-to-on-click and a
 * progress highlight for the chapter the playhead is currently inside.
 *
 * Used by podcast and video-streaming surfaces for in-episode chapter
 * navigation. It is the Vue counterpart of
 * `@molecule/app-feature-chapter-list-react`: the same exports, the same props
 * (React names) and the same DOM for the same input, so an app switches
 * framework by changing only the package name in its imports.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 *
 * import { ChapterList } from '@molecule/app-feature-chapter-list-vue'
 *
 * const Player = defineComponent({
 *   setup() {
 *     const currentTime = ref(150)
 *     return () =>
 *       h(ChapterList, {
 *         chapters: [
 *           { id: 'c1', title: 'Intro', startTime: 0 },
 *           { id: 'c2', title: 'Topic A', startTime: 120, thumbnail: '/a.jpg' },
 *           { id: 'c3', title: 'Outro', startTime: 1800 },
 *         ],
 *         currentTime: currentTime.value,
 *         onSeek: (s: number) => (currentTime.value = s),
 *       })
 *   },
 * })
 *
 * createApp(Player).mount('#app')
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`setClassMap()` at startup) and an i18n
 *   provider (for the region, empty-state and row labels) or rendering throws.
 * - The active chapter is the last one whose `startTime` is `<= currentTime`;
 *   it carries `data-active="true"` and `aria-current="true"` plus the
 *   "Now playing" badge.
 * - When `onSeek` is omitted the rows render as static, non-interactive
 *   elements. `rowTrailing` is called with each chapter to render a trailing
 *   slot (e.g. a download button).
 * - Translations live in the companion
 *   `@molecule/app-locales-feature-chapter-list` bond.
 *
 * @module
 */

export * from './ChapterList.js'
export * from './timestamps.js'
export * from './types.js'

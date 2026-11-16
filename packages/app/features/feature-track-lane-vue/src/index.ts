/**
 * Vue horizontal track-lane primitive for multi-track timelines (music DAW,
 * video editor, animation tool). Renders one lane row of draggable + resizable
 * clip blocks on a `pixelsPerSecond` time axis.
 *
 * Vue counterpart of `@molecule/app-feature-track-lane-react`: the same props
 * (React names), the same DOM for the same input, and the same callback calls,
 * so an app switches framework by changing only the package name it imports.
 *
 * Exports `<TrackLane>` and the `Clip` type, plus the pure-function helpers
 * `clipToPixels`, `pixelsToTime` and `clampClipMove` that back the
 * pointer-event drag/resize math.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { TrackLane } from '@molecule/app-feature-track-lane-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     const selected = ref<string>()
 *     return () =>
 *       h(TrackLane, {
 *         name: 'Drums',
 *         clips: [
 *           { id: 'a', startTime: 0, duration: 2, color: '#0af', label: 'Kick' },
 *           { id: 'b', startTime: 4, duration: 1.5, label: 'Snare' },
 *         ],
 *         pixelsPerSecond: 20,
 *         selectedClipId: selected.value,
 *         onClipClick: (clipId: string) => {
 *           selected.value = clipId
 *         },
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`cm.flex`, `cm.cn`, …) — rendering throws
 *   otherwise. No router dependency.
 * - Every visible string comes from `useTranslation()` (`trackLane.aria.*` and
 *   `trackLane.header`), so a locale switch re-renders it.
 * - `name` is node-valued: pass it as a prop or as the same-named slot.
 *
 * @module
 */

export * from './geometry.js'
export * from './TrackLane.js'
export * from './types.js'

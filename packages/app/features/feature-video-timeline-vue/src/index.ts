/**
 * Vue multi-track video timeline for video editors, DAWs and animation tools.
 * Composes one `<TrackLane>` per track row with a shared time ruler, playhead,
 * zoom slider + Ctrl+wheel zoom, and ripple/insert edit modes.
 *
 * Vue counterpart of `@molecule/app-feature-video-timeline-react`: the same
 * props (React names), the same DOM for the same input, and the same callback
 * calls, so an app switches framework by changing only the package name it
 * imports.
 *
 * Exports `<VideoTimeline>`, the `Track` and `VideoTimelineMode` types,
 * and the pure-function helpers `clampZoom`, `zoomFromWheelDelta`,
 * `computeRulerTicks`, `computeRippleUpdates`, and `formatTickTime`
 * that back the zoom math, ruler tick generation, and ripple-mode
 * fan-out.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { VideoTimeline } from '@molecule/app-feature-video-timeline-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     const currentTime = ref(3.2)
 *     const zoom = ref(20)
 *     return () =>
 *       h(VideoTimeline, {
 *         tracks: [
 *           {
 *             id: 'v1',
 *             kind: 'video',
 *             clips: [{ id: 'a', startTime: 0, duration: 5, label: 'Intro' }],
 *           },
 *           {
 *             id: 'a1',
 *             kind: 'audio',
 *             clips: [{ id: 'b', startTime: 0, duration: 12 }],
 *           },
 *         ],
 *         currentTime: currentTime.value,
 *         duration: 60,
 *         pixelsPerSecond: zoom.value,
 *         mode: 'ripple',
 *         onSeek: (t: number) => {
 *           currentTime.value = t
 *         },
 *         onClipMove: (id: string, startTime: number, trackId: string) => {
 *           updateClip(trackId, id, { startTime })
 *         },
 *         onClipResize: (id: string, duration: number, trackId: string) => {
 *           updateClip(trackId, id, { duration })
 *         },
 *         onZoomChange: (pps: number) => {
 *           zoom.value = pps
 *         },
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`cm.flex`, `cm.cn`, …) and the binding's i18n
 *   plugin for the translated labels — rendering throws without a ClassMap.
 * - Ripple mode (default) shifts all later clips on the same lane by the same
 *   delta when a clip is dragged, preserving inter-clip gaps. Switch to
 *   `mode: 'insert'` to drop the dragged clip at its new position without
 *   disturbing the rest of the lane.
 * - Every visible string comes from `useTranslation()` (`videoTimeline.aria.*`,
 *   `videoTimeline.trackKind.*`, `videoTimeline.mode.*`, `videoTimeline.zoom.*`),
 *   so a locale switch re-renders the timeline.
 *
 * @module
 */

export * from './timeline.js'
export * from './types.js'
export * from './VideoTimeline.js'

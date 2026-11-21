/**
 * Angular multi-track video timeline for video editors, DAWs and animation
 * tools. Composes one `<TrackLane>` per track row with a shared time ruler,
 * playhead, zoom slider + Ctrl+wheel zoom, and ripple/insert edit modes.
 *
 * Angular counterpart of `@molecule/app-feature-video-timeline-react`: the
 * same props (React names), the same DOM for the same input, and the same
 * callback calls, so an app switches framework by changing only the package
 * name it imports.
 *
 * Exports `VideoTimeline`, the `Track` and `VideoTimelineMode` types,
 * and the pure-function helpers `clampZoom`, `zoomFromWheelDelta`,
 * `computeRulerTicks`, `computeRippleUpdates`, and `formatTickTime`
 * that back the zoom math, ruler tick generation, and ripple-mode
 * fan-out.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { VideoTimeline } from '@molecule/app-feature-video-timeline-angular'
 *
 * @Component({
 *   selector: 'app-editor',
 *   standalone: true,
 *   imports: [VideoTimeline],
 *   template: `
 *     <div
 *       mol-video-timeline
 *       [tracks]="tracks"
 *       [currentTime]="currentTime()"
 *       [duration]="60"
 *       [pixelsPerSecond]="zoom()"
 *       mode="ripple"
 *       [onSeek]="seek"
 *     ></div>
 *   `,
 * })
 * export class Editor {
 *   readonly currentTime = signal(3.2)
 *   readonly zoom = signal(20)
 *   readonly tracks = [
 *     {
 *       id: 'v1',
 *       kind: 'video',
 *       clips: [{ id: 'a', startTime: 0, duration: 5, label: 'Intro' }],
 *     },
 *     {
 *       id: 'a1',
 *       kind: 'audio',
 *       clips: [{ id: 'b', startTime: 0, duration: 12 }],
 *     },
 *   ]
 *
 *   seek = (time: number): void => {
 *     this.currentTime.set(time)
 *   }
 * }
 * ```
 *
 * @remarks
 * - The host IS React's root `<div>` — render `div[mol-video-timeline]` and
 *   bind the React-named inputs (`[onSeek]`, `[onClipMove]`, … take functions).
 * - Requires a bonded ClassMap (`cm.flex`, `cm.cn`, …) and the binding's i18n
 *   provider for the translated labels — rendering throws without a ClassMap.
 * - Ripple mode (default) shifts all later clips on the same lane by the same
 *   delta when a clip is dragged, preserving inter-clip gaps. Switch to
 *   `mode="insert"` to drop the dragged clip at its new position without
 *   disturbing the rest of the lane.
 * - Every visible string comes from `useTranslation()` (`videoTimeline.aria.*`,
 *   `videoTimeline.trackKind.*`, `videoTimeline.mode.*`, `videoTimeline.zoom.*`),
 *   so a locale switch re-renders the timeline.
 *
 * @module
 */

export * from './timeline.js'
export * from './types.js'
export * from './video-timeline.component.js'

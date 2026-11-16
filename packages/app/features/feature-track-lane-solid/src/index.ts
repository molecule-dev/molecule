/**
 * Solid horizontal track-lane primitive for multi-track timelines (music DAW,
 * video editor, animation tool). Renders one lane row of draggable + resizable
 * clip blocks on a `pixelsPerSecond` time axis.
 *
 * Solid counterpart of `@molecule/app-feature-track-lane-react`: the same props
 * (React names), the same DOM for the same input, and the same callback calls,
 * so an app switches framework by changing only the package name it imports.
 *
 * Exports `<TrackLane>` and the `Clip` type, plus the pure-function helpers
 * `clipToPixels`, `pixelsToTime` and `clampClipMove` that back the
 * pointer-event drag/resize math.
 *
 * @example
 * ```tsx
 * import { createSignal } from 'solid-js'
 * import { TrackLane } from '@molecule/app-feature-track-lane-solid'
 *
 * export function Lane() {
 *   const [selected, setSelected] = createSignal<string>()
 *   return (
 *     <TrackLane
 *       name="Drums"
 *       clips={[
 *         { id: 'a', startTime: 0, duration: 2, color: '#0af', label: 'Kick' },
 *         { id: 'b', startTime: 4, duration: 1.5, label: 'Snare' },
 *       ]}
 *       pixelsPerSecond={20}
 *       selectedClipId={selected()}
 *       onClipClick={(clipId) => setSelected(clipId)}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`cm.flex`, `cm.cn`, …) — rendering throws
 *   otherwise. No router dependency.
 * - Every visible string comes from `useTranslation()` (`trackLane.aria.*` and
 *   `trackLane.header`), so a locale switch re-renders it.
 * - Node-valued props (`name`, a clip's `label`) take Solid JSX values.
 *
 * @module
 */

export * from './geometry.js'
export * from './TrackLane.jsx'
export * from './types.js'

/**
 * React animation-canvas primitives.
 *
 * Exports:
 * - `<AnimationCanvas>` — SVG renderer that interpolates shape state
 *   between keyframes with optional per-property bezier easing.
 * - `interpolateState`, `bracketKeyframes`, `lerp`, `pickEasing` —
 *   pure interpolation helpers.
 * - `cubicBezier`, `sampleEasing`, `resolveEasing`, `easingFunctions`
 *   — pure easing helpers.
 * - `AnimationKeyframe`, `ShapeState`, `ShapeEasing`, `Easing`,
 *   `EasingPreset`, `CubicBezierPoints` types.
 *
 * Used by the animation-tool flagship app to drive a state-machine
 * keyframe graph + bezier easing curves over an SVG canvas.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import {
 *   AnimationCanvas,
 *   type AnimationKeyframe,
 * } from '@molecule/app-feature-animation-canvas-react'
 *
 * const keyframes: AnimationKeyframe[] = [
 *   { time: 0, state: [{ id: 'box', x: 0, y: 50, rotation: 0, scale: 1, opacity: 1 }] },
 *   { time: 1, state: [{ id: 'box', x: 200, y: 50, rotation: 90, scale: 1.5, opacity: 1, easing: 'easeInOut' }] },
 * ]
 *
 * export function AnimationEditor() {
 *   const [time, setTime] = useState(0.5)
 *   return (
 *     <AnimationCanvas
 *       keyframes={keyframes}
 *       currentTime={time}
 *       onSeek={setTime}
 *       width={400}
 *       height={200}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - The canvas draws every shape as a fixed 24px square filled with
 *   `currentColor` (transformed by x/y/rotation/scale/opacity). There is
 *   no shape-type, size, color, or custom-renderer prop yet — for real
 *   artwork, use the exported interpolation/easing helpers
 *   (`interpolateState`, `sampleEasing`, …) to drive your own SVG.
 * - Keyframes MUST be sorted ascending by `time`; the interpolators do
 *   not sort for you.
 * - `onChange` is reserved for future built-in interactions — the canvas
 *   itself never mutates keyframes today. Clicking maps linearly across
 *   the width to a time and fires `onSeek`.
 * - Aria labels resolve through `t()` with English fallbacks; companion
 *   locale bond: `@molecule/app-locales-feature-animation-canvas`.
 *   Requires a wired ClassMap bond and the app I18nProvider.
 * - **Must render inside `<I18nProvider>` / `<MoleculeProvider>`** from `@molecule/app-react`: it
 *   calls `useTranslation()`, which throws outside one. `getClassMap()` throws unless
 *   `setClassMap(classMap)` from `@molecule/app-ui` ran at startup.
 * - It does NOT play anything: there is no timer. Advance `currentTime` yourself (e.g. a
 *   `requestAnimationFrame` loop or a scrubber). Time outside the keyframe range is clamped.
 * - `easing` on a keyframe shapes the segment LEADING INTO that keyframe, not out of it.
 *
 * @module
 */

export * from './AnimationCanvas.js'
export * from './easing.js'
export * from './interpolation.js'
export * from './types.js'

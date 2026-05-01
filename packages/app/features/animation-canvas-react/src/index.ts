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
 * function Demo() {
 *   const [t, setT] = useState(0)
 *   return (
 *     <AnimationCanvas
 *       keyframes={keyframes}
 *       currentTime={t}
 *       onSeek={setT}
 *       width={400}
 *       height={200}
 *     />
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './AnimationCanvas.js'
export * from './easing.js'
export * from './interpolation.js'
export * from './types.js'

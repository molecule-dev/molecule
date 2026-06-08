import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactElement } from 'react'
import { useCallback, useMemo, useRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { interpolateState } from './interpolation.js'
import type { AnimationKeyframe, ShapeState } from './types.js'

/** `<AnimationCanvas>` props. */
export interface AnimationCanvasProps {
  /**
   * Keyframes (sorted ascending by `time`). Each entry is a snapshot of
   * every shape's state at a moment in time.
   */
  keyframes: AnimationKeyframe[]
  /**
   * Optional callback fired when the consumer mutates keyframes via a
   * built-in interaction. (Currently the canvas itself never mutates;
   * the prop exists so consumers can adopt the controlled / uncontrolled
   * pattern as the feature grows.)
   */
  onChange?: (next: AnimationKeyframe[]) => void
  /** Current playhead time. Clamped to the keyframe range internally. */
  currentTime: number
  /** Optional callback fired when the user scrubs the timeline. */
  onSeek?: (next: number) => void
  /** Canvas width in CSS pixels. */
  width: number
  /** Canvas height in CSS pixels. */
  height: number
  /** Extra classes merged onto the outer wrapper. */
  className?: string
}

const DEFAULT_SHAPE_SIZE = 24

/**
 * SVG animation canvas. Renders the interpolated shape state at
 * `currentTime` between the two bracketing keyframes, applying any
 * per-property bezier easing curves declared on the target keyframe.
 *
 * The canvas itself is rendering-only — mutations to keyframes are
 * delegated to the consumer via `onChange`. Scrub via `onSeek` (clicking
 * the canvas seeks to the corresponding time linearly mapped across
 * width). Style is driven entirely by `getClassMap()`; inline styles
 * are reserved for SVG attributes that classes can't express.
 *
 * @param props - Component props.
 * @returns The animation canvas element.
 * @example
 * ```tsx
 * <AnimationCanvas
 *   keyframes={[
 *     { time: 0, state: [{ id: 'a', x: 0, y: 50, rotation: 0, scale: 1, opacity: 1 }] },
 *     { time: 1, state: [{ id: 'a', x: 200, y: 50, rotation: 90, scale: 1.5, opacity: 1, easing: 'easeInOut' }] },
 *   ]}
 *   currentTime={0.5}
 *   width={400}
 *   height={200}
 * />
 * ```
 */
export function AnimationCanvas(props: AnimationCanvasProps): ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()

  const { keyframes, currentTime, onSeek, width, height, className } = props

  const rootRef = useRef<SVGSVGElement | null>(null)

  const shapes: ShapeState[] = useMemo(
    () => interpolateState(keyframes, currentTime),
    [keyframes, currentTime],
  )

  const firstTime = keyframes[0]?.time ?? 0
  const lastTime = keyframes[keyframes.length - 1]?.time ?? 0
  const span = lastTime - firstTime

  /**
   * Map a click on the canvas surface to a playhead time and surface it
   * via `onSeek`. The mapping is linear across width.
   *
   * @param e - Pointer-down event on the canvas root.
   */
  const onPointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (!onSeek) return
      const rect = rootRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0) return
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const next = span === 0 ? firstTime : firstTime + ratio * span
      onSeek(next)
    },
    [onSeek, firstTime, span],
  )

  const ariaLabel = t('animationCanvas.aria.canvas', {}, { defaultValue: 'Animation canvas' })
  const ariaShape = t('animationCanvas.aria.shape', {}, { defaultValue: 'Animated shape' })

  const wrapperStyle: CSSProperties = {
    overflow: 'hidden',
    touchAction: 'none',
    width,
    height,
  }

  return (
    <svg
      ref={rootRef}
      role="img"
      aria-label={ariaLabel}
      data-mol-id="animation-canvas"
      className={cm.cn(cm.position('relative'), cm.surfaceSecondary, className)}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      onPointerDown={onPointerDown}
      style={wrapperStyle}
    >
      {shapes.map((shape) => {
        const size = DEFAULT_SHAPE_SIZE
        const transform = `translate(${shape.x} ${shape.y}) rotate(${shape.rotation}) scale(${shape.scale})`
        return (
          <g
            key={shape.id}
            data-mol-id={`animation-canvas-shape-${shape.id}`}
            data-shape-id={shape.id}
            transform={transform}
            opacity={shape.opacity}
            aria-label={ariaShape}
          >
            <rect
              x={-size / 2}
              y={-size / 2}
              width={size}
              height={size}
              fill="currentColor"
              data-mol-id={`animation-canvas-shape-fill-${shape.id}`}
            />
          </g>
        )
      })}
    </svg>
  )
}

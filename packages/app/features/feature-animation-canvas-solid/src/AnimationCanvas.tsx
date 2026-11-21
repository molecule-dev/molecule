/**
 * Solid animation canvas: SVG renderer that interpolates shape state between
 * keyframes with optional per-property bezier easing.
 *
 * Solid counterpart of `@molecule/app-feature-animation-canvas-react`'s
 * `AnimationCanvas` — the same props (React names), the same ClassMap tokens
 * and the same DOM for the same input.
 *
 * @module
 */

import { type Component, For, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { interpolateState } from './interpolation.js'
import type { AnimationCanvasProps, ShapeState } from './types.js'

/** Side of the fixed square every shape is drawn as, in canvas units. */
const DEFAULT_SHAPE_SIZE = 24

/** One stable record per shape id, so `<For>` keys shapes by id like React. */
interface ShapeRecord {
  id: string
}

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
 * @param props - Component props (see {@link AnimationCanvasProps}).
 * @returns The animation canvas element.
 */
export const AnimationCanvas: Component<AnimationCanvasProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  const shapes = (): ShapeState[] => interpolateState(props.keyframes, props.currentTime)
  const firstTime = (): number => props.keyframes[0]?.time ?? 0
  const lastTime = (): number => props.keyframes[props.keyframes.length - 1]?.time ?? 0
  const span = (): number => lastTime() - firstTime()

  /** One stable record per shape id, so a re-render keeps each shape's DOM. */
  const records = new Map<string, ShapeRecord>()

  /**
   * The current shapes' stable records, in render order.
   *
   * @returns The records for the current shapes, creating one per new id.
   */
  const keyedShapes = (): ShapeRecord[] => {
    const seen = new Set<string>()
    const ordered: ShapeRecord[] = []
    for (const shape of shapes()) {
      seen.add(shape.id)
      let record = records.get(shape.id)
      if (!record) {
        record = { id: shape.id }
        records.set(shape.id, record)
      }
      ordered.push(record)
    }
    for (const id of [...records.keys()]) if (!seen.has(id)) records.delete(id)
    return ordered
  }

  /**
   * The shape a record stands for (its content stays reactive while its DOM
   * node is kept).
   *
   * @param id - The shape id.
   * @returns The shape, or undefined while it is leaving.
   */
  const shapeFor = (id: string): ShapeState | undefined => shapes().find((shape) => shape.id === id)

  /**
   * Map a click on the canvas surface to a playhead time and surface it
   * via `onSeek`. The mapping is linear across width.
   *
   * @param event - Pointer-down event on the canvas root.
   */
  const onPointerDown = (event: PointerEvent): void => {
    if (!props.onSeek) return
    const root = event.currentTarget as SVGSVGElement
    const rect = root.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    props.onSeek(span() === 0 ? firstTime() : firstTime() + ratio * span())
  }

  return (
    <svg
      role="img"
      aria-label={t('animationCanvas.aria.canvas', {}, { defaultValue: 'Animation canvas' })}
      data-mol-id="animation-canvas"
      class={cm.cn(cm.position('relative'), cm.surfaceSecondary, props.className)}
      width={props.width}
      height={props.height}
      viewBox={`0 0 ${props.width} ${props.height}`}
      onPointerDown={onPointerDown}
      style={{
        overflow: 'hidden',
        'touch-action': 'none',
        width: `${props.width}px`,
        height: `${props.height}px`,
      }}
    >
      <For each={keyedShapes()}>
        {(record) => (
          <Show when={shapeFor(record.id)}>
            {(shape) => {
              const size = DEFAULT_SHAPE_SIZE
              return (
                <g
                  data-mol-id={`animation-canvas-shape-${record.id}`}
                  data-shape-id={record.id}
                  transform={`translate(${shape().x} ${shape().y}) rotate(${shape().rotation}) scale(${shape().scale})`}
                  opacity={shape().opacity}
                >
                  <rect
                    x={-size / 2}
                    y={-size / 2}
                    width={size}
                    height={size}
                    fill="currentColor"
                    data-mol-id={`animation-canvas-shape-fill-${record.id}`}
                  />
                </g>
              )
            }}
          </Show>
        )}
      </For>
    </svg>
  )
}

/**
 * Vue animation canvas: SVG renderer that interpolates shape state between
 * keyframes with optional per-property bezier easing.
 *
 * Vue counterpart of `@molecule/app-feature-animation-canvas-react`'s
 * `AnimationCanvas` — the same props (React names), the same ClassMap tokens
 * and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { interpolateState } from './interpolation.js'
import type { AnimationCanvasProps, AnimationKeyframe } from './types.js'

/** Side of the fixed square every shape is drawn as, in canvas units. */
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
 * @param props - Component props (see {@link AnimationCanvasProps}).
 * @returns The animation canvas component.
 */
export const AnimationCanvas = defineComponent({
  name: 'AnimationCanvas',
  props: {
    keyframes: {
      type: Array as PropType<AnimationKeyframe[]>,
      required: true,
    },
    onChange: {
      type: Function as PropType<AnimationCanvasProps['onChange']>,
      default: undefined,
    },
    currentTime: {
      type: Number,
      required: true,
    },
    onSeek: {
      type: Function as PropType<AnimationCanvasProps['onSeek']>,
      default: undefined,
    },
    width: {
      type: Number,
      required: true,
    },
    height: {
      type: Number,
      required: true,
    },
    className: {
      type: String as PropType<string>,
      default: undefined,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const shapes = interpolateState(props.keyframes, props.currentTime)

      const firstTime = props.keyframes[0]?.time ?? 0
      const lastTime = props.keyframes[props.keyframes.length - 1]?.time ?? 0
      const span = lastTime - firstTime

      /**
       * Map a click on the canvas surface to a playhead time and surface it
       * via `onSeek`. The mapping is linear across width.
       *
       * @param event - Pointer-down event on the canvas root.
       */
      const onPointerDown = (event: PointerEvent): void => {
        if (!props.onSeek) return
        const root = event.currentTarget as SVGSVGElement | null
        const rect = root?.getBoundingClientRect()
        if (!rect || rect.width === 0) return
        const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
        const next = span === 0 ? firstTime : firstTime + ratio * span
        props.onSeek(next)
      }

      const ariaLabel = t('animationCanvas.aria.canvas', {}, { defaultValue: 'Animation canvas' })

      return h(
        'svg',
        {
          role: 'img',
          'aria-label': ariaLabel,
          'data-mol-id': 'animation-canvas',
          class: cm.cn(cm.position('relative'), cm.surfaceSecondary, props.className),
          width: props.width,
          height: props.height,
          viewBox: `0 0 ${props.width} ${props.height}`,
          onPointerdown: onPointerDown,
          style: {
            overflow: 'hidden',
            touchAction: 'none',
            width: `${props.width}px`,
            height: `${props.height}px`,
          },
        },
        shapes.map((shape) => {
          const size = DEFAULT_SHAPE_SIZE
          const transform = `translate(${shape.x} ${shape.y}) rotate(${shape.rotation}) scale(${shape.scale})`
          return h(
            'g',
            {
              key: shape.id,
              'data-mol-id': `animation-canvas-shape-${shape.id}`,
              'data-shape-id': shape.id,
              transform,
              opacity: shape.opacity,
            },
            [
              h('rect', {
                x: -size / 2,
                y: -size / 2,
                width: size,
                height: size,
                fill: 'currentColor',
                'data-mol-id': `animation-canvas-shape-fill-${shape.id}`,
              }),
            ],
          )
        }),
      )
    }
  },
})

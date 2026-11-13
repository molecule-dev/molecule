/**
 * Vue Skeleton UI components with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import type { SkeletonProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { classOf, styleOf } from '../utilities/attrs.js'

/**
 * Merges an incoming style value with computed declarations the way React's
 * `{...style, ...computed}` object spread does.
 *
 * @param base - The incoming style prop value (object, string or array).
 * @param extra - The computed declarations, which win over `base`.
 * @returns The style value for `h()`, or `undefined` when neither is set.
 */
function mergeStyles(
  base: unknown,
  extra: Record<string, string | undefined> | undefined,
): unknown {
  if (extra === undefined) return base
  if (base === undefined || base === null) return extra
  if (typeof base === 'string') return [base, extra]
  if (Array.isArray(base)) return [...base, extra]
  return { ...(base as Record<string, unknown>), ...extra }
}

/**
 * Vue Skeleton UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Skeleton: a placeholder block
 * styled by `cm.skeleton()` with circle, border-radius and animation
 * variants; numeric dimensions are converted to `px` inline styles.
 */
export const Skeleton = defineComponent({
  name: 'MSkeleton',
  inheritAttrs: false,
  props: {
    width: [String, Number] as PropType<string | number>,
    height: [String, Number] as PropType<string | number>,
    circle: Boolean,
    borderRadius: [String, Number] as PropType<string | number>,
    animation: {
      type: String as PropType<'pulse' | 'wave' | 'none'>,
      default: 'pulse',
    },
    className: String,
    style: [String, Object] as PropType<SkeletonProps['style']>,
    testId: String,
  },
  setup(props, { attrs }) {
    const cm = getClassMap()

    return () => {
      const skeletonClasses = cm.cn(
        cm.skeleton(),
        props.circle && cm.skeletonCircle,
        props.animation === 'none' && cm.skeletonNone,
        props.animation === 'wave' && cm.skeletonWave,
        ...classOf(props.className, attrs),
      )

      const computedStyle: Record<string, string | undefined> = {
        width: typeof props.width === 'number' ? `${props.width}px` : props.width,
        height: typeof props.height === 'number' ? `${props.height}px` : props.height,
        borderRadius: props.circle
          ? '9999px'
          : typeof props.borderRadius === 'number'
            ? `${props.borderRadius}px`
            : props.borderRadius,
      }

      // If circle, make width and height equal
      if (props.circle && props.width && !props.height) {
        computedStyle.height = computedStyle.width
      }

      return h('div', {
        class: skeletonClasses,
        style: mergeStyles(styleOf(props.style, attrs), computedStyle),
        'data-testid': props.testId,
      })
    }
  },
})

/**
 * Vue SkeletonText UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s SkeletonText: a stack of
 * skeleton lines where the last line tapers to 60% width.
 */
export const SkeletonText = defineComponent({
  name: 'MSkeletonText',
  inheritAttrs: false,
  props: {
    lines: {
      type: Number,
      default: 3,
    },
    className: String,
  },
  setup(props, { attrs }) {
    const cm = getClassMap()

    return () =>
      h(
        'div',
        { class: cm.cn(cm.skeletonTextContainer, ...classOf(props.className, attrs)) },
        Array.from({ length: props.lines }).map((_, i) =>
          h(Skeleton, {
            key: i,
            height: 16,
            width: i === props.lines - 1 ? '60%' : '100%',
          }),
        ),
      )
  },
})

/**
 * Vue SkeletonCircle UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s SkeletonCircle: a circular
 * skeleton (avatar placeholder) of the given square `size`.
 */
export const SkeletonCircle = defineComponent({
  name: 'MSkeletonCircle',
  inheritAttrs: false,
  props: {
    size: {
      type: Number,
      default: 40,
    },
    className: String,
  },
  setup(props, { attrs }) {
    const cm = getClassMap()

    return () => {
      const className = cm.cn(...classOf(props.className, attrs))
      return h(Skeleton, {
        circle: true,
        width: props.size,
        height: props.size,
        className,
      })
    }
  },
})

/**
 * Vue Skeleton UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import { getClassMap } from '@molecule/app-ui'

/**
 * Vue Skeleton UI component with UIClassMap-driven styling.
 */
export const Skeleton = defineComponent({
  name: 'MSkeleton',
  props: {
    width: [String, Number],
    height: [String, Number],
    circle: Boolean,
    borderRadius: [String, Number],
    animation: {
      type: String as PropType<'pulse' | 'wave' | 'none'>,
      default: 'pulse',
    },
    class: String,
  },
  setup(props) {
    const cm = getClassMap()

    return () => {
      const skeletonClasses = cm.cn(
        cm.skeleton(),
        props.circle && cm.skeletonCircle,
        props.animation === 'none' && cm.skeletonNone,
        props.animation === 'wave' && cm.skeletonWave,
        props.class,
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

      return h('div', { class: skeletonClasses, style: computedStyle })
    }
  },
})

/**
 * SkeletonText component.
 */
export const SkeletonText = defineComponent({
  name: 'MSkeletonText',
  props: {
    lines: {
      type: Number,
      default: 3,
    },
    class: String,
  },
  setup(props) {
    const cm = getClassMap()

    return () =>
      h(
        'div',
        { class: cm.cn(cm.skeletonTextContainer, props.class) },
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
 * SkeletonCircle component.
 */
export const SkeletonCircle = defineComponent({
  name: 'MSkeletonCircle',
  props: {
    size: {
      type: Number,
      default: 40,
    },
    class: String,
  },
  setup(props) {
    return () =>
      h(Skeleton, { circle: true, width: props.size, height: props.size, class: props.class })
  },
})

/**
 * Vue Badge UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import type { BadgeProps, ColorVariant, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { classOf, styleOf } from '../utilities/attrs.js'

/**
 * Vue Badge UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Badge: a `<span>` styled by
 * `cm.badge({ variant: color, size })`, square corners via `cm.badgeSquare`
 * when `rounded` is false.
 */
export const Badge = defineComponent({
  name: 'MBadge',
  inheritAttrs: false,
  props: {
    color: {
      type: String as PropType<ColorVariant>,
      default: 'primary',
    },
    variant: {
      type: String as PropType<'solid' | 'outline' | 'subtle'>,
      default: 'solid',
    },
    size: String as PropType<Size>,
    rounded: {
      type: Boolean,
      default: true,
    },
    className: String,
    style: [String, Object] as PropType<BadgeProps['style']>,
    testId: String,
  },
  setup(props, { attrs, slots }) {
    const cm = getClassMap()

    return () => {
      const badgeClasses = cm.cn(
        cm.badge({ variant: props.color, size: props.size }),
        !props.rounded && cm.badgeSquare,
        ...classOf(props.className, attrs),
      )

      return h(
        'span',
        {
          class: badgeClasses,
          style: styleOf(props.style, attrs),
          'data-testid': props.testId,
        },
        slots.default?.(),
      )
    }
  },
})

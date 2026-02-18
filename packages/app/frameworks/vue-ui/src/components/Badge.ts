/**
 * Vue Badge UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import type { ColorVariant, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Vue Badge UI component with UIClassMap-driven styling.
 */
export const Badge = defineComponent({
  name: 'MBadge',
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
    class: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return () => {
      const badgeClasses = cm.cn(
        cm.badge({ variant: props.color, size: props.size }),
        !props.rounded && cm.badgeSquare,
        props.class,
      )

      return h('span', { class: badgeClasses }, slots.default?.())
    }
  },
})

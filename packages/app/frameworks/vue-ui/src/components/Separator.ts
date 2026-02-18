/**
 * Vue Separator UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import { getClassMap } from '@molecule/app-ui'

/**
 * Vue Separator UI component with UIClassMap-driven styling.
 */
export const Separator = defineComponent({
  name: 'MSeparator',
  props: {
    orientation: {
      type: String as PropType<'horizontal' | 'vertical'>,
      default: 'horizontal',
    },
    decorative: {
      type: Boolean,
      default: true,
    },
    class: String,
  },
  setup(props) {
    const cm = getClassMap()

    return () => {
      const separatorClasses = cm.cn(cm.separator({ orientation: props.orientation }), props.class)

      return h('div', {
        role: props.decorative ? 'none' : 'separator',
        'aria-orientation': props.decorative ? undefined : props.orientation,
        class: separatorClasses,
      })
    }
  },
})

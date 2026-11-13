/**
 * Vue Separator UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import type { BaseProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { classOf, styleOf } from '../utilities/attrs.js'

/**
 * Props for the Separator component.
 */
export interface SeparatorProps extends BaseProps {
  /**
   * Orientation of the separator.
   */
  orientation?: 'horizontal' | 'vertical'

  /**
   * Decorative separators are purely visual.
   */
  decorative?: boolean
}

/**
 * Vue Separator UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Separator: a `<div>` styled by
 * `cm.separator({ orientation })`, decorative by default (`role="none"`);
 * a semantic separator (`decorative: false`) renders `role="separator"` with
 * `aria-orientation`.
 */
export const Separator = defineComponent({
  name: 'MSeparator',
  inheritAttrs: false,
  props: {
    orientation: {
      type: String as PropType<'horizontal' | 'vertical'>,
      default: 'horizontal',
    },
    decorative: {
      type: Boolean,
      default: true,
    },
    className: String,
    style: [String, Object] as PropType<BaseProps['style']>,
    testId: String,
  },
  setup(props, { attrs }) {
    const cm = getClassMap()

    return () => {
      const separatorClasses = cm.cn(
        cm.separator({ orientation: props.orientation }),
        ...classOf(props.className, attrs),
      )

      return h('div', {
        role: props.decorative ? 'none' : 'separator',
        'aria-orientation': props.decorative ? undefined : props.orientation,
        class: separatorClasses,
        style: styleOf(props.style, attrs),
        'data-testid': props.testId,
      })
    }
  },
})

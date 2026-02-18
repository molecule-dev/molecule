/**
 * Vue Spinner UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import { t } from '@molecule/app-i18n'
import type { ColorVariant, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Vue Spinner UI component with UIClassMap-driven styling.
 */
export const Spinner = defineComponent({
  name: 'MSpinner',
  props: {
    size: {
      type: String as PropType<Size>,
      default: 'md',
    },
    color: String as PropType<ColorVariant | string>,
    label: String,
    class: String,
  },
  setup(props) {
    const cm = getClassMap()

    return () => {
      const classes = cm.cn(cm.spinner({ size: props.size }), props.class)

      const colorStyle =
        props.color &&
        typeof props.color === 'string' &&
        !['primary', 'secondary', 'success', 'warning', 'error', 'info'].includes(props.color)
          ? { borderColor: props.color, borderTopColor: 'transparent' }
          : undefined

      return h(
        'div',
        {
          role: 'status',
          'aria-label':
            props.label || t('ui.spinner.loading', undefined, { defaultValue: 'Loading' }),
          class: classes,
          style: colorStyle,
        },
        props.label ? h('span', { class: cm.srOnly }, props.label) : undefined,
      )
    }
  },
})

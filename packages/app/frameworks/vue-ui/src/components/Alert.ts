/**
 * Vue Alert UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import { t } from '@molecule/app-i18n'
import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'

const statusVariantMap: Record<ColorVariant, 'default' | 'info' | 'success' | 'warning' | 'error'> =
  {
    primary: 'default',
    secondary: 'default',
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'info',
  }

const statusIconMap: Record<string, string> = {
  info: 'info-circle',
  success: 'check-circle',
  warning: 'exclamation-triangle',
  error: 'x-circle',
}

/**
 * Vue Alert UI component with UIClassMap-driven styling.
 */
export const Alert = defineComponent({
  name: 'MAlert',
  props: {
    title: String,
    status: {
      type: String as PropType<ColorVariant>,
      default: 'info',
    },
    variant: String as PropType<'solid' | 'subtle' | 'outline' | 'left-accent'>,
    dismissible: Boolean,
    dismissLabel: String,
    class: String,
  },
  emits: ['dismiss'],
  setup(props, { emit, slots }) {
    const cm = getClassMap()

    return () => {
      const alertVariant = statusVariantMap[props.status] || 'default'

      const alertClasses = cm.cn(cm.alert({ variant: alertVariant }), props.class)

      const iconName = statusIconMap[alertVariant]

      return h('div', { role: 'alert', class: alertClasses }, [
        // Icon
        (slots.icon || iconName) &&
          h(
            'span',
            { class: cm.alertIconWrapper },
            slots.icon?.() || renderIcon(iconName, cm.iconMd),
          ),
        // Content
        h('div', { class: cm.alertContent }, [
          props.title && h('h5', { class: cm.alertTitle }, props.title),
          h('div', { class: cm.alertDescription }, slots.default?.()),
        ]),
        // Dismiss button
        props.dismissible &&
          h(
            'button',
            {
              type: 'button',
              onClick: () => emit('dismiss'),
              class: cm.alertDismiss,
              'aria-label':
                props.dismissLabel ?? t('ui.alert.dismiss', undefined, { defaultValue: 'Dismiss' }),
            },
            renderIcon('x-mark', cm.iconSm),
          ),
      ])
    }
  },
})

/**
 * Vue Alert UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue'

import type { IconName } from '@molecule/app-icons'
import type { AlertProps, ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { classOf, styleOf } from '../utilities/attrs.js'
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

/**
 * Map alert status to icon name.
 */
const statusIconMap: Record<string, IconName> = {
  info: 'info-circle',
  success: 'check-circle',
  warning: 'exclamation-triangle',
  error: 'x-circle',
}

/**
 * Vue Alert UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Alert.
 *
 * `role="alert"` is assertive: it interrupts a screen reader immediately,
 * which is correct ONLY for content that appears dynamically (a validation
 * error after submit, a save failure). An Alert rendered statically with
 * the rest of the page (an informational banner already in the initial
 * render) has nothing to interrupt — announcing it assertively on mount is
 * the same over-announcing trap the Toast role fix addresses. `live`
 * (default `true`, matching the previous unconditional behavior so no
 * existing dynamic-error usage silently goes quiet) makes this honest and
 * caller-controlled: pass `live: false` (React: `live={false}`) for a banner
 * that is part of the page's normal content, and it announces politely
 * (`role="status"`) instead of interrupting.
 */
export const Alert = defineComponent({
  name: 'MAlert',
  inheritAttrs: false,
  props: {
    title: null,
    status: {
      type: String as PropType<ColorVariant>,
      default: 'info',
    },
    variant: String as PropType<AlertProps['variant']>,
    live: {
      type: Boolean,
      default: true,
    },
    dismissible: {
      type: Boolean,
      default: false,
    },
    dismissLabel: String,
    icon: null,
    className: String,
    style: [String, Object] as PropType<AlertProps['style']>,
    testId: String,
  },
  emits: ['dismiss'],
  setup(props, { attrs, slots, emit }) {
    const cm = getClassMap()
    // Reactive t: text re-renders when the locale changes (parity with app-react).
    const { t } = useTranslation()

    return () => {
      const alertVariant = statusVariantMap[props.status] || 'default'
      const iconName = statusIconMap[alertVariant]
      const defaultIcon = iconName ? renderIcon(iconName, cm.iconMd) : null
      const icon = props.icon ?? slots.icon?.()

      const alertClasses = cm.cn(
        cm.alert({ variant: alertVariant }),
        // The core contract types variant="left-accent"; render it as a 4px
        // status-colored leading bar (previously silently dropped).
        props.variant === 'left-accent' && cm.alertLeftAccent({ variant: alertVariant }),
        ...classOf(props.className, attrs),
      )
      const role = props.live ? 'alert' : 'status'

      return h(
        'div',
        {
          role,
          class: alertClasses,
          style: styleOf(props.style, attrs),
          'data-testid': props.testId,
        },
        [
          (icon || defaultIcon) &&
            h('span', { class: cm.alertIconWrapper }, [(icon || defaultIcon) as VNodeChild]),
          h('div', { class: cm.alertContent }, [
            props.title && h('h5', { class: cm.alertTitle }, [props.title as VNodeChild]),
            h('div', { class: cm.alertDescription }, slots.default?.()),
          ]),
          props.dismissible &&
            h(
              'button',
              {
                type: 'button',
                onClick: (event: MouseEvent) => emit('dismiss', event),
                class: cm.alertDismiss,
                'aria-label':
                  props.dismissLabel ??
                  t('ui.alert.dismiss', undefined, { defaultValue: 'Dismiss' }),
              },
              [renderIcon('x-mark', cm.iconSm)],
            ),
        ],
      )
    }
  },
})

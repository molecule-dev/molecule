/**
 * Vue Spinner UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import { t } from '@molecule/app-i18n'
import type { ColorVariant, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'

/** The `color` values that name a ClassMap variant rather than a CSS color. */
const NAMED_COLOR_VARIANTS = ['primary', 'secondary', 'success', 'warning', 'error', 'info']

/**
 * Vue Spinner UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Spinner: a `role="status"` div
 * with an accessible label, styled by `cm.spinner({ size })`, that shows a
 * custom (non-variant) border color inline and forwards `data-*` / `aria-*`
 * props to the root element.
 */
export const Spinner = defineComponent({
  name: 'MSpinner',
  inheritAttrs: false,
  props: {
    size: {
      type: String as PropType<Size>,
      default: 'md',
    },
    color: [String, Object] as PropType<ColorVariant | string | Record<string, unknown>>,
    label: String,
    className: String,
    style: [String, Object] as PropType<Record<string, string | number> | string>,
    testId: String,
  },
  setup(props, { attrs }) {
    const cm = getClassMap()

    return () => {
      const classes = cm.cn(cm.spinner({ size: props.size }), ...classOf(props.className, attrs))

      const colorStyle =
        props.color &&
        typeof props.color === 'string' &&
        !NAMED_COLOR_VARIANTS.includes(props.color)
          ? { borderColor: props.color, borderTopColor: 'transparent' }
          : undefined

      // React forwards only data-* and aria-* from the rest props.
      const passthrough: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(restAttrs(attrs))) {
        if (key.startsWith('data-') || key.startsWith('aria-')) passthrough[key] = value
      }

      return h(
        'div',
        {
          role: 'status',
          'aria-label':
            props.label || t('ui.spinner.loading', undefined, { defaultValue: 'Loading' }),
          class: classes,
          style: colorStyle
            ? mergeStyles(styleOf(props.style, attrs), colorStyle)
            : styleOf(props.style, attrs),
          'data-testid': props.testId,
          ...passthrough,
        },
        props.label ? [h('span', { class: cm.srOnly }, props.label)] : undefined,
      )
    }
  },
})

/**
 * Merges two style values the way React's `{...style, ...colorStyle}` does
 * when both are objects.
 *
 * @param base - The incoming style prop value.
 * @param extra - The computed color style.
 * @returns The merged style for `h()`.
 */
function mergeStyles(base: unknown, extra: Record<string, string>): unknown {
  if (base === undefined || base === null) return extra
  if (typeof base === 'string') return [base, extra]
  if (Array.isArray(base)) return [...base, extra]
  return { ...(base as Record<string, unknown>), ...extra }
}

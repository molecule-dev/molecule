/**
 * Vue selection-aware bulk action toolbar.
 *
 * Vue counterpart of `@molecule/app-bulk-action-toolbar-react`'s
 * `BulkActionToolbar` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { BulkAction } from './types.js'

/**
 * Vue selection-aware bulk action toolbar.
 *
 * Renders nothing while `count <= 0` (the render function returns null, the
 * way React's component does). `position` defaults to `'sticky-bottom'`
 * (16px inset, z-30); `'sticky-top'` and `'inline'` are also supported.
 * Destructive actions render as solid error-colored buttons. The count
 * label, the Clear button and the toolbar's own `aria-label` are translated
 * via `useTranslation()` with React's exact keys and default values.
 *
 * @param props - Component props (see {@link BulkActionToolbarProps} in
 *   `./types.js`).
 * @returns The toolbar component.
 */
export const BulkActionToolbar = defineComponent({
  name: 'BulkActionToolbar',
  props: {
    count: { type: Number, required: true },
    actions: { type: Array as PropType<BulkAction[]>, required: true },
    onClearSelection: Function as PropType<() => void>,
    position: {
      type: String as PropType<'sticky-bottom' | 'sticky-top' | 'inline'>,
      default: 'sticky-bottom',
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /**
     * React's sticky inline style for the current position — undefined for
     * `'inline'`, the way React leaves the style off.
     * @returns The style object, or undefined.
     */
    const stickyStyle = (): Record<string, string | number> | undefined =>
      props.position === 'sticky-bottom'
        ? { position: 'sticky', bottom: '16px', zIndex: 30 }
        : props.position === 'sticky-top'
          ? { position: 'sticky', top: '16px', zIndex: 30 }
          : undefined

    return (): VNode | null => {
      if (props.count <= 0) return null

      // One button per action, keyed by the action's id the way React keys
      // its list — a re-passed equal array keeps the rendered buttons.
      const buttons: VNodeChild[] = props.actions.map((action) =>
        h(
          Button,
          {
            key: action.id,
            variant: action.destructive ? 'solid' : 'ghost',
            color: action.destructive ? 'error' : undefined,
            size: 'sm',
            onClick: action.onClick,
            disabled: action.disabled,
          },
          {
            default: () => {
              const content: VNodeChild[] = []
              if (action.icon != null) content.push(action.icon)
              if (action.label) content.push(h('span', action.label))
              return content
            },
          },
        ),
      )
      if (props.onClearSelection) {
        buttons.push(
          h(Button, { variant: 'ghost', size: 'sm', onClick: props.onClearSelection }, () =>
            t('bulkActions.clear', {}, { defaultValue: 'Clear' }),
          ),
        )
      }

      return h(
        'div',
        {
          role: 'region',
          'aria-label': t('bulkActions.aria.toolbar', {}, { defaultValue: 'Bulk actions' }),
          class: cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            props.className,
          ),
          style: stickyStyle(),
        },
        [
          h(
            'span',
            { class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')) },
            t(
              'bulkActions.selected',
              { count: props.count },
              { defaultValue: '{{count}} selected' },
            ),
          ),
          h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, buttons),
        ],
      )
    }
  },
})

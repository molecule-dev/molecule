/**
 * Vue kebab-menu row actions: a three-dots trigger that opens a popover menu of
 * actions, detached so consumers can drop it into custom row layouts.
 *
 * Vue counterpart of `@molecule/app-admin-table-react`'s `AdminTableRowActions`
 * — the same props (React names), the same ClassMap tokens, and the same DOM
 * for the same input. Dismisses on an outside click (mouse) or on Escape
 * (keyboard, from wherever focus sits); every item is a native button/link, so
 * the whole menu is keyboard-operable.
 *
 * @module
 */

import {
  defineComponent,
  h,
  onBeforeUnmount,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
  watch,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { AdminTableRowAction } from './types.js'

/** Any row shape, as the component is generic over it. */
type AnyRow = unknown

/** An action set over an untyped row, so any caller's actions fit. */
type ActionSet = AdminTableRowAction<AnyRow>[]

/**
 * Calls one of an action's row functions (`hrefFor`, `dataMolIdFor`,
 * `onSelect`) with the row it belongs to.
 *
 * @param fn - The caller's function.
 * @param row - The row.
 * @returns Whatever the function returns.
 */
const call = <R>(fn: (row: AnyRow) => R, row: unknown): R => (fn as (r: unknown) => R)(row)

/**
 * Three-dots row actions menu.
 *
 * @param props - Component props (see {@link AdminTableRowActionsProps}).
 * @returns The row-actions menu component.
 */
export const AdminTableRowActions = defineComponent({
  name: 'AdminTableRowActions',
  inheritAttrs: false,
  props: {
    row: { type: null, required: true },
    actions: { type: Array as PropType<ActionSet>, required: true },
    ariaLabel: { type: String, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const open = ref(false)
    const popover = ref<HTMLDivElement | null>(null)

    /**
     * Closes the menu for a click outside the popover; clicks on the menu
     * surface or between items stay put, and each item closes the menu itself
     * (React's containment check).
     *
     * @param event - The document click.
     */
    const onDocumentClick = (event: MouseEvent): void => {
      const target = event.target
      if (popover.value && target instanceof Node && popover.value.contains(target)) return
      open.value = false
    }

    /**
     * Closes the menu on Escape, from wherever focus sits (React's
     * document-level keyboard parity for the mouse's outside-click dismissal).
     *
     * @param event - The document keydown.
     */
    const onDocumentKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') open.value = false
    }

    // As in React's effect: the listeners exist only while the menu is open.
    watch(open, (isOpen) => {
      if (isOpen) {
        document.addEventListener('click', onDocumentClick)
        document.addEventListener('keydown', onDocumentKeydown)
        return
      }
      document.removeEventListener('click', onDocumentClick)
      document.removeEventListener('keydown', onDocumentKeydown)
    })

    onBeforeUnmount(() => {
      document.removeEventListener('click', onDocumentClick)
      document.removeEventListener('keydown', onDocumentKeydown)
    })

    return (): VNode => {
      const itemClass = (action: AdminTableRowAction<AnyRow>): string =>
        cm.cn(
          cm.flex({ align: 'center' }),
          cm.w('full'),
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.cursorPointer,
          // Theme-aware hover surface.
          cm.tableRowHoverable,
          // Destructive → theme error color + weight.
          action.destructive ? cm.textError : '',
          action.destructive ? cm.fontWeight('semibold') : '',
        )

      const items: VNodeChild[] = props.actions.map((action, index) => {
        const href = action.hrefFor ? call(action.hrefFor, props.row) : undefined
        const dataMolId = action.dataMolIdFor ? call(action.dataMolIdFor, props.row) : undefined
        const className = itemClass(action)
        if (href) {
          return h(
            'a',
            {
              key: index,
              href,
              class: className,
              'data-mol-id': dataMolId,
              onClick: () => {
                open.value = false
              },
            },
            [action.label],
          )
        }
        return h(
          'button',
          {
            key: index,
            class: className,
            'data-mol-id': dataMolId,
            onClick: async () => {
              open.value = false
              await call(action.onSelect, props.row)
            },
          },
          [action.label],
        )
      })

      return h('div', { class: cm.cn(cm.position('relative')) }, [
        h(
          Button,
          {
            variant: 'ghost',
            size: 'icon',
            // The translated default when the caller passes no label; the render
            // re-runs on a locale switch, so the name follows it like every
            // other t() string.
            'aria-label':
              props.ariaLabel ??
              t('adminTable.aria.rowActions', undefined, { defaultValue: 'Row actions' }),
            'aria-haspopup': 'menu',
            'aria-expanded': open.value ? 'true' : 'false',
            'data-mol-id': 'admin-table-row-actions-trigger',
            onClick: (event: MouseEvent) => {
              event.stopPropagation()
              open.value = !open.value
            },
          },
          () => [
            // The ligature name is font data, not text; the button's aria-label names it.
            h(
              'span',
              { 'aria-hidden': 'true', class: cm.cn(cm.iconGlyphFont), 'data-icon': 'more_vert' },
              ['more_vert'],
            ),
          ],
        ),
        open.value
          ? h(
              'div',
              {
                ref: popover,
                class: cm.cn(cm.surface, cm.borderAll),
                style: {
                  position: 'absolute',
                  top: '100%',
                  right: '0px',
                  marginTop: '4px',
                  minWidth: '160px',
                  zIndex: '20',
                  borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                },
              },
              [h('div', { class: cm.cn(cm.sp('py', 1)) }, items)],
            )
          : null,
      ])
    }
  },
})

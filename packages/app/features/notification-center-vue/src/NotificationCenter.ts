/**
 * Vue notification dropdown panel.
 *
 * Vue counterpart of `@molecule/app-notification-center-react`'s
 * `NotificationCenter` — the same props (React names), the same ClassMap
 * tokens, the same i18n keys, and the same DOM for the same input. Node-valued
 * props (`title`, `emptyState`) accept either the prop or a same-named slot.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Alert, Button } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { NotificationItem } from './types.js'

/** The panel's fixed inline style (React's `style={{ minWidth: 320, maxHeight: 480, overflowY: 'auto' }}`). */
const panelStyle = { minWidth: '320px', maxHeight: '480px', overflowY: 'auto' }
/** The unread dot's inline style (React's numeric width/height/marginTop; the colour is a ClassMap class). */
const dotStyle = {
  width: '8px',
  height: '8px',
  marginTop: '6px',
}

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: a
 * prop that was given wins (React's single source of truth — a later `null`
 * falls back), and the slot is used only while the prop is absent.
 *
 * @param prop - The prop value, when the caller passed the prop.
 * @param slot - The slot render function, when the caller passed the slot.
 * @param fallback - What React renders when neither is present.
 * @returns The children to render.
 */
const nodeOr = (
  prop: VNodeChild,
  slot: (() => VNodeChild[]) | undefined,
  fallback: VNodeChild[],
): VNodeChild[] => {
  if (prop !== undefined && prop !== null) return [prop]
  if (slot) {
    const nodes = slot()
    if (nodes.length > 0) return nodes
  }
  return fallback
}

/**
 * Renders one item field that may be a node or plain text.
 *
 * @param value - The field value.
 * @returns The children to render (nothing for a nullish value).
 */
const field = (value: VNodeChild): VNodeChild[] => (value == null ? [] : [value])

/**
 * Standalone notification panel — title + mark-all-read action + scrollable
 * item list + footer "View all". Drop inside a popover / dropdown / drawer to
 * make a full notification center.
 *
 * @param props - Component props (see {@link NotificationCenterProps}).
 * @returns The notification center component.
 */
export const NotificationCenter = defineComponent({
  name: 'NotificationCenter',
  props: {
    items: {
      type: Array as PropType<NotificationItem[]>,
      required: true,
    },
    onMarkAllRead: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    onViewAll: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    emptyState: null,
    title: null,
    className: String,
    lastError: {
      type: Object as PropType<Error>,
      default: undefined,
    },
    onRetry: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /**
     * When the row is interactive, Enter / Space activate it (React's
     * `onKeyDown`): preventDefault, then the click handler with no event.
     *
     * @param it - The item.
     * @returns The keydown handler.
     */
    const itemKeyDown =
      (it: NotificationItem) =>
      (event: KeyboardEvent): void => {
        if (!it.onClick) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          it.onClick()
        }
      }

    /** The item rows, each in a keyed `<li>` wrapping the row's button surface. */
    const itemRow = (it: NotificationItem): VNode =>
      h('li', { key: it.id }, [
        // A `li` cannot take button semantics, so the row is a wrapper around
        // its content: a button in the a11y tree (role + tabindex + Enter /
        // Space activation) while the item is clickable, the plain row div
        // otherwise.
        h(
          'div',
          {
            onClick: it.onClick ? (event: MouseEvent) => it.onClick?.(event) : undefined,
            onKeydown: it.onClick ? itemKeyDown(it) : undefined,
            role: it.onClick ? 'button' : undefined,
            tabindex: it.onClick ? 0 : undefined,
            class: cm.cn(
              cm.flex({ align: 'start', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              it.onClick ? cm.cursorPointer : undefined,
              it.read ? undefined : cm.bgPrimarySubtle,
            ),
          },
          [
            it.leading ? h('div', { class: cm.shrink0 }, field(it.leading)) : null,
            h('div', { class: cm.cn(cm.flex1, cm.stack(0 as const)) }, [
              // The unread state is announced, not only shown: a screen reader
              // reads "Unread" before the title (WCAG 1.3.1).
              !it.read
                ? h(
                    'span',
                    { class: cm.cn(cm.srOnly) },
                    t('notifications.unread', {}, { defaultValue: 'Unread' }),
                  )
                : null,
              h(
                'span',
                {
                  class: cm.cn(
                    cm.textSize('sm'),
                    it.read ? cm.fontWeight('medium') : cm.fontWeight('semibold'),
                  ),
                },
                field(it.title),
              ),
              it.body ? h('span', { class: cm.textSize('xs') }, field(it.body)) : null,
              it.timestamp ? h('span', { class: cm.textSize('xs') }, field(it.timestamp)) : null,
            ]),
            !it.read
              ? h('span', {
                  'aria-hidden': 'true',
                  class: cm.cn(cm.bgPrimary, cm.roundedFull),
                  style: dotStyle,
                })
              : null,
          ],
        ),
      ])

    return (): VNode => {
      const hasItems = props.items.length > 0
      return h(
        'div',
        {
          class: cm.cn(cm.stack(0 as const), props.className),
          style: panelStyle,
        },
        [
          h(
            'header',
            {
              class: cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                cm.sp('p', 3),
              ),
            },
            [
              h(
                'h3',
                { class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')) },
                nodeOr(props.title, slots.title, [
                  t('notifications.title', {}, { defaultValue: 'Notifications' }),
                ]),
              ),
              props.onMarkAllRead && hasItems
                ? h(Button, { variant: 'ghost', size: 'sm', onClick: props.onMarkAllRead }, () =>
                    t('notifications.markAllRead', {}, { defaultValue: 'Mark all as read' }),
                  )
                : null,
            ],
          ),
          props.lastError
            ? h('div', { class: cm.sp('px', 3) }, [
                h(Alert, { status: 'error' }, () => [
                  h('div', { class: cm.flex({ align: 'center', justify: 'between', gap: 'sm' }) }, [
                    h(
                      'span',
                      { class: cm.textSize('sm') },
                      t(
                        'notifications.loadError',
                        {},
                        {
                          defaultValue: 'Could not load notifications.',
                        },
                      ),
                    ),
                    h(
                      Button,
                      {
                        variant: 'ghost',
                        size: 'sm',
                        onClick: props.onRetry,
                        'data-mol-id': 'notification-center-retry',
                      },
                      () => t('notifications.retry', {}, { defaultValue: 'Retry' }),
                    ),
                  ]),
                ]),
              ])
            : null,
          !hasItems
            ? nodeOr(props.emptyState, slots.emptyState, [
                h(
                  'div',
                  {
                    class: cm.cn(cm.sp('p', 6), cm.textCenter, cm.textSize('sm')),
                  },
                  t('notifications.empty', {}, { defaultValue: 'No notifications' }),
                ),
              ])
            : h('ul', { class: cm.stack(0 as const) }, props.items.map(itemRow)),
          props.onViewAll && hasItems
            ? h('footer', { class: cm.cn(cm.sp('p', 2), cm.textCenter) }, [
                h(Button, { variant: 'ghost', size: 'sm', onClick: props.onViewAll }, () =>
                  t('notifications.viewAll', {}, { defaultValue: 'View all' }),
                ),
              ])
            : null,
        ],
      )
    }
  },
})

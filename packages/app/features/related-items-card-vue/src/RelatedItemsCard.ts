/**
 * Vue card container for cross-linked / related item lists.
 *
 * Vue counterpart of `@molecule/app-related-items-card-react`'s
 * `RelatedItemsCard` — the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input: a titled Card with header + list +
 * empty state + "View all" link.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-vue'

/**
 * A render function for one item, declared with a `never` parameter so that
 * any `(item: T, index) => VNodeChild` an app passes is assignable to it (a
 * function parameter is checked contravariantly).
 */
type ItemRenderer = (item: never, index: number) => VNodeChild

/**
 * Calls the caller's row renderer with the item it belongs to.
 *
 * @param render - The caller's render function.
 * @param item - The row's item.
 * @param index - The row's index.
 * @returns The node(s) the caller rendered.
 */
const renderRow = (render: ItemRenderer, item: unknown, index: number): VNodeChild =>
  (render as (value: unknown, index: number) => VNodeChild)(item, index)

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and a value React renders as nothing (`undefined`, `null`, `''`,
 * `false`) contributes no node.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  if (prop === undefined || prop === null || prop === '' || prop === false) return []
  return [prop]
}

/**
 * Card container for a list of cross-linked / related items.
 *
 * Common usage: "Company → Deals", "Contact → Notes", "Ticket → Related
 * Articles", "Post → Related Posts". Apps supply the item data and a renderer;
 * the card provides consistent header + list + empty-state + view-all chrome.
 *
 * @param props - Component props (`RelatedItemsCardProps`).
 * @returns The related items card component.
 */
export const RelatedItemsCard = defineComponent({
  name: 'RelatedItemsCard',
  props: {
    /** Card heading (a string renders as text; a node may arrive as the `title` slot). */
    title: null,
    /** Optional leading icon in the header (may arrive as the `icon` slot). */
    icon: null,
    /** Items to render. */
    items: {
      type: Array as PropType<readonly unknown[]>,
      required: true,
    },
    /** Render function for each item. */
    renderItem: {
      type: Function as PropType<ItemRenderer>,
      required: true,
    },
    /** Called when an item row is clicked (if applicable). */
    onItemClick: {
      type: Function as PropType<((item: unknown, index: number) => void) | undefined>,
      default: undefined,
    },
    /** Rendered when `items` is empty (may arrive as the `emptyState` slot). */
    emptyState: null,
    /** Optional "View all" link rendered in the header. */
    viewAllHref: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    /** Optional right-aligned header actions (may arrive as the `headerActions` slot). */
    headerActions: null,
    /** Extra classes on the Card. */
    className: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    /** `data-mol-id` for AI-agent selectors. */
    dataMolId: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const title = slotOrProp(slots.title, props.title)
      const icon = slotOrProp(slots.icon, props.icon)
      const headerActions = slotOrProp(slots.headerActions, props.headerActions)
      const emptyState = slotOrProp(slots.emptyState, props.emptyState)

      const headerStart = h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
        ...icon,
        h('h3', { class: cm.cn(cm.textSize('base'), cm.fontWeight('semibold')) }, title),
      ])
      const headerEnd = h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
        ...headerActions,
        ...(props.viewAllHref
          ? [
              h(
                'a',
                { href: props.viewAllHref, class: cm.cn(cm.textSize('sm'), cm.link) },
                'View all',
              ),
            ]
          : []),
      ])

      const body: VNodeChild[] =
        props.items.length === 0
          ? emptyState
          : [
              h(
                'ul',
                { class: cm.stack(2) },
                props.items.map((item, i) =>
                  h(
                    'li',
                    {
                      key: i,
                      onClick: props.onItemClick
                        ? (): void => props.onItemClick?.(item, i)
                        : undefined,
                      class: props.onItemClick ? cm.cursorPointer : undefined,
                    },
                    [renderRow(props.renderItem, item, i)],
                  ),
                ),
              ),
            ]

      return h(
        Card,
        { className: props.className, 'data-mol-id': props.dataMolId },
        {
          default: () => [
            h('div', { class: cm.stack(3) }, [
              h('header', { class: cm.flex({ justify: 'between', align: 'center', gap: 'sm' }) }, [
                headerStart,
                headerEnd,
              ]),
              ...body,
            ]),
          ],
        },
      )
    }
  },
})

/**
 * Vue listing / product card shell — the Vue counterpart of
 * `@molecule/app-listing-card-react`'s `ListingCard`: the same props (React
 * names), the same ClassMap tokens and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import type { ButtonVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-vue'
import { useOptimisticValue } from '@molecule/app-vue'

import { ListingCardActions } from './ListingCardActions.js'
import { slotOrProp } from './slots.js'
import type { ListingCardProps, ListingCardToggleProps } from './types.js'

/**
 * Shows both fields of a card action and saves the person's latest selection.
 *
 * The Vue counterpart of React's private `ListingCardToggle`: renders the
 * counted button inside a `<ListingCardActions>` row, changes pressed state and
 * count on the first click, and saves with `useOptimisticValue` so a rejected
 * save puts both fields back together.
 *
 * @param props - Loaded value, save function, labels and button props.
 * @returns The card action row.
 */
const ListingCardToggle = defineComponent({
  name: 'ListingCardToggle',
  inheritAttrs: false,
  props: {
    value: {
      type: Object as PropType<ListingCardToggleProps['value']>,
      required: true,
    },
    commit: {
      type: Function as PropType<ListingCardToggleProps['commit']>,
      required: true,
    },
    onError: {
      type: Function as PropType<ListingCardToggleProps['onError']>,
      default: undefined,
    },
    activeLabel: {
      type: null,
      required: true,
    },
    inactiveLabel: {
      type: null,
      required: true,
    },
    dataMolId: {
      type: String,
      default: 'listing-card-toggle',
    },
    variant: {
      type: String as PropType<ButtonVariant>,
      default: undefined,
    },
  },
  setup(props, { attrs }) {
    const optimistic = useOptimisticValue(() => ({
      value: props.value,
      commit: (next) => props.commit(next.pressed),
      onError: (error) => props.onError?.(error),
    }))

    return (): VNode => {
      const { pressed, count } = optimistic.value.value

      const buttonProps: Record<string, unknown> = {
        'data-mol-id': props.dataMolId,
        ...attrs,
        type: 'button',
        variant: props.variant ?? (pressed ? 'solid' : 'outline'),
        'aria-pressed': pressed,
        'aria-busy': optimistic.pending.value,
        onClick: (event: MouseEvent) => {
          event.stopPropagation()
          optimistic.update((current) => ({
            pressed: !current.pressed,
            count: Math.max(0, current.count + (current.pressed ? -1 : 1)),
          }))
        },
      }

      return h(ListingCardActions, null, {
        default: () => [
          h(Button, buttonProps, {
            default: () => [
              pressed ? props.activeLabel : props.inactiveLabel,
              ' ',
              h('span', null, String(count)),
            ],
          }),
        ],
      })
    }
  },
})

/**
 * Product / property / listing card shell. Just a `<Card>` with vertical
 * stacking of its children — typically `<ListingCardMedia>` +
 * `<ListingCardBody>` + `<ListingCardActions>`.
 *
 * A supplied `onClick` makes the whole card cursor-pointer, exactly as React's
 * `cm.cursorPointer` condition does. A supplied `toggle` renders the counted
 * card action after the content, outside any links in it.
 *
 * @param props - Component props (see {@link ListingCardProps}).
 * @returns The listing card component.
 */
export const ListingCard = defineComponent({
  name: 'ListingCard',
  props: {
    children: null,
    toggle: {
      type: Object as PropType<ListingCardProps['toggle']>,
      default: undefined,
    },
    onClick: {
      type: Function as PropType<ListingCardProps['onClick']>,
      default: undefined,
    },
    className: String,
    dataMolId: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        Card,
        {
          'data-mol-id': props.dataMolId,
          onClick: (event: MouseEvent) => props.onClick?.(event),
          className: cm.cn(props.onClick ? cm.cursorPointer : undefined, props.className),
        },
        {
          default: () => [
            h('div', { class: cm.stack(0) }, [
              ...slotOrProp(slots.default, props.children),
              ...(props.toggle ? [h(ListingCardToggle, { ...props.toggle })] : []),
            ]),
          ],
        },
      )
  },
})

import { type Component, Show, splitProps } from 'solid-js'

import { useOptimisticValue } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-solid'

import { ListingCardActions } from './ListingCardActions.jsx'
import type { ListingCardProps, ListingCardToggleProps } from './types.js'

/**
 * Shows both fields of a card action and saves the person's latest selection.
 *
 * This is the Solid counterpart of `@molecule/app-listing-card-react`'s
 * `ListingCardToggle`: the same props (React names), the same ClassMap tokens
 * and the same DOM for the same input.
 *
 * @param props - Loaded value, save function, labels and button props.
 * @returns The card action row.
 */
const ListingCardToggle: Component<ListingCardToggleProps> = (props) => {
  const [local, buttonProps] = splitProps(props, [
    'value',
    'commit',
    'onError',
    'activeLabel',
    'inactiveLabel',
    'dataMolId',
    'variant',
  ])
  const toggle = useOptimisticValue<{ pressed: boolean; count: number }>({
    value: local.value,
    commit: (next) => local.commit(next.pressed),
    onError: (error) => local.onError?.(error),
  })

  return (
    <ListingCardActions>
      <Button
        automationId={local.dataMolId ?? 'listing-card-toggle'}
        {...buttonProps}
        type="button"
        variant={local.variant ?? (toggle.value().pressed ? 'solid' : 'outline')}
        aria-pressed={toggle.value().pressed}
        aria-busy={toggle.pending()}
        onClick={(event) => {
          event.stopPropagation()
          toggle.update((current) => ({
            pressed: !current.pressed,
            count: Math.max(0, current.count + (current.pressed ? -1 : 1)),
          }))
        }}
      >
        {toggle.value().pressed ? local.activeLabel : local.inactiveLabel}{' '}
        <span>{toggle.value().count}</span>
      </Button>
    </ListingCardActions>
  )
}

/**
 * Product / property / listing card shell. Just a `<Card>` with vertical
 * stacking of its children — typically `<ListingCardMedia>` +
 * `<ListingCardBody>` + `<ListingCardActions>`.
 *
 * This is the Solid counterpart of `@molecule/app-listing-card-react`'s
 * `ListingCard`: the same props (React names), the same ClassMap tokens and
 * the same DOM for the same input.
 *
 * @param props - Component props (see {@link ListingCardProps}).
 * @returns The rendered listing card.
 */
export const ListingCard: Component<ListingCardProps> = (props) => {
  const cm = getClassMap()
  return (
    <Card
      data-mol-id={props.dataMolId}
      onClick={(event) => props.onClick?.(event)}
      className={cm.cn(props.onClick ? cm.cursorPointer : undefined, props.className)}
    >
      <div class={cm.stack(0)}>
        {props.children}
        <Show when={props.toggle}>{(toggle) => <ListingCardToggle {...toggle()} />}</Show>
      </div>
    </Card>
  )
}

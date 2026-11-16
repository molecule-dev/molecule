import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-solid'

import type { ListingCardProps } from './types.js'

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
      onClick={(event: MouseEvent) => props.onClick?.(event)}
      className={cm.cn(props.onClick ? cm.cursorPointer : undefined, props.className)}
    >
      <div class={cm.stack(0)}>{props.children}</div>
    </Card>
  )
}

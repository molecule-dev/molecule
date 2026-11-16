import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { ListingCardActionsProps } from './types.js'

/**
 * Bottom action row of a `<ListingCard>` (Add to cart, Save, etc.).
 *
 * This is the Solid counterpart of `@molecule/app-listing-card-react`'s
 * `ListingCardActions`: the same props (React names), the same ClassMap
 * tokens and the same DOM for the same input.
 *
 * @param props - Component props (see {@link ListingCardActionsProps}).
 * @returns The rendered action row.
 */
export const ListingCardActions: Component<ListingCardActionsProps> = (props) => {
  const cm = getClassMap()
  const layout = (): 'col' | 'row' => (props.layout === 'stacked' ? 'col' : 'row')
  return (
    <div
      class={cm.cn(
        cm.flex({ direction: layout(), gap: 'sm', align: 'stretch' }),
        cm.sp('p', 3),
        props.className,
      )}
    >
      {props.children}
    </div>
  )
}

import type { Component } from 'solid-js'

import { PresentWhileNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { ListingCardBodyProps } from './types.js'

/**
 * Body of a `<ListingCard>` — title / subtitle / price / meta rows stacked.
 * Every optional row renders only when its prop carries something, exactly as
 * React's `{node && …}` conditions do.
 *
 * This is the Solid counterpart of `@molecule/app-listing-card-react`'s
 * `ListingCardBody`: the same props (React names), the same ClassMap tokens
 * and the same DOM for the same input.
 *
 * @param props - Component props (see {@link ListingCardBodyProps}).
 * @returns The rendered card body.
 */
export const ListingCardBody: Component<ListingCardBodyProps> = (props) => {
  const cm = getClassMap()
  return (
    <div class={cm.cn(cm.stack(1), cm.sp('p', 3), props.className)}>
      <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{props.title}</h3>
      <PresentWhileNode node={props.subtitle}>
        {(subtitle) => <p class={cm.textSize('sm')}>{subtitle()}</p>}
      </PresentWhileNode>
      <PresentWhileNode node={props.price}>
        {(price) => <p class={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{price()}</p>}
      </PresentWhileNode>
      <PresentWhileNode node={props.meta}>
        {(meta) => (
          <div class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>{meta()}</div>
        )}
      </PresentWhileNode>
    </div>
  )
}

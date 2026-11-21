/**
 * Solid card container for cross-linked / related item lists.
 *
 * Solid counterpart of `@molecule/app-related-items-card-react`'s
 * `RelatedItemsCard` — the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input: a titled Card with header + list +
 * empty state + "View all" link.
 *
 * @module
 */

import { createMemo, type JSX } from 'solid-js'
import { Index } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-solid'

import type { RelatedItemsCardProps } from './types.js'

/**
 * Card container for a list of cross-linked / related items.
 *
 * Common usage: "Company → Deals", "Contact → Notes", "Ticket → Related
 * Articles", "Post → Related Posts". Apps supply the item data and a renderer;
 * the card provides consistent header + list + empty-state + view-all chrome.
 *
 * Clickable rows (`onItemClick`): the `<li>` stays a list item and the card
 * wraps the row content in an inner `role="button"` div — focusable, with
 * Enter/Space running the same handler the click does.
 *
 * Rows keep their DOM node while the item at their index changes, as React's
 * index-keyed rows do: `<Index>` reconciles by position and the memo rebuilds
 * the rendered content for the new item.
 *
 * @param props - Component props (see {@link RelatedItemsCardProps}).
 * @returns The rendered related items card.
 */
export function RelatedItemsCard<T>(props: RelatedItemsCardProps<T>): JSX.Element {
  const cm = getClassMap()
  return (
    <Card className={props.className} data-mol-id={props.dataMolId}>
      <div class={cm.stack(3)}>
        <header class={cm.flex({ justify: 'between', align: 'center', gap: 'sm' })}>
          <div class={cm.flex({ align: 'center', gap: 'sm' })}>
            {props.icon}
            <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{props.title}</h3>
          </div>
          <div class={cm.flex({ align: 'center', gap: 'sm' })}>
            {props.headerActions}
            {props.viewAllHref ? (
              <a href={props.viewAllHref} class={cm.cn(cm.textSize('sm'), cm.link)}>
                View all
              </a>
            ) : null}
          </div>
        </header>
        {props.items.length === 0 ? (
          props.emptyState
        ) : (
          <ul class={cm.stack(2)}>
            <Index each={props.items}>
              {(item, i) => {
                const content = createMemo(() => props.renderItem(item(), i))
                return (
                  <li>
                    {props.onItemClick ? (
                      // Keyboard activation for a clickable row — the same call
                      // the mouse click makes. The row control is a
                      // `role="button"` div (an `<li>` may not carry button
                      // semantics), so it activates Enter and Space itself.
                      <div
                        role="button"
                        tabIndex={0}
                        class={cm.cursorPointer}
                        onClick={() => props.onItemClick?.(item(), i)}
                        onKeyDown={(event: KeyboardEvent): void => {
                          if (event.key !== 'Enter' && event.key !== ' ') return
                          event.preventDefault()
                          props.onItemClick?.(item(), i)
                        }}
                      >
                        {content()}
                      </div>
                    ) : (
                      content()
                    )}
                  </li>
                )
              }}
            </Index>
          </ul>
        )}
      </div>
    </Card>
  )
}

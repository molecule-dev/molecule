/**
 * Solid vertical notification feed: typed icon + title + body + relative time
 * with optional unread border-l accent and optional per-row link.
 *
 * Solid counterpart of `@molecule/app-notification-feed-react`'s
 * `NotificationFeed` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import { type Accessor, type Component, For, type JSX, Show } from 'solid-js'

import { Link } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { fmtRelativeShort } from './fmtRelativeShort.js'
import type { FeedItem, NotificationFeedProps } from './types.js'

/** A row identity record: created once per item id and reused while the id is present. */
interface Row {
  id: string
}

/**
 * Vertical notification feed: typed icon + title + body + relative time,
 * with an optional unread left-border accent and an optional per-row link.
 *
 * Apps build their own typed-icon mapping (notif.type → icon name) and pass
 * the resolved icon string in. Keeps this package free of per-app type unions.
 *
 * React keys each row by the item's `id` value, so a re-passed or re-ordered
 * array keeps the rendered rows per id. Solid's `For` keys by reference, so the
 * rows are keyed through stable per-id records: the record for an id is created
 * once and reused, while the row's content reads the CURRENT item for that id
 * reactively. A row with an `href` renders the binding's `<Link>`
 * (react-router's `<Link to>` contract) around the row card.
 *
 * @param props - Component props (see {@link NotificationFeedProps}).
 * @returns The rendered notification feed.
 */
export const NotificationFeed: Component<NotificationFeedProps> = (props) => {
  const cm = getClassMap()

  /** One stable record per item id, created on first sight. */
  const records = new Map<string, Row>()
  const keyedRows = (): Row[] => {
    const seen = new Set<string>()
    const rows = props.items.map((item) => {
      seen.add(item.id)
      let row = records.get(item.id)
      if (!row) {
        row = { id: item.id }
        records.set(item.id, row)
      }
      return row
    })
    for (const id of [...records.keys()]) if (!seen.has(id)) records.delete(id)
    return rows
  }
  const itemFor = (id: string): FeedItem | undefined => props.items.find((item) => item.id === id)

  /**
   * One row's card: icon tile, headline, relative time and body.
   *
   * The row's item is read through an accessor so every field follows the
   * CURRENT item for this row's id: a re-passed array updates the card in
   * place, as React re-renders the keyed row.
   *
   * @param item - The row's current item.
   * @returns The card element.
   */
  const card = (item: Accessor<FeedItem>): JSX.Element => (
    <div
      class={cm.cn(
        cm.card(),
        cm.sp('p', 4),
        cm.flex({ align: 'start', gap: 'md' }),
        item().unread ? cm.notificationFeedUnreadAccent : '',
      )}
    >
      <div
        class={cm.cn(
          cm.shrink0,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.roundedFull,
          cm.textPrimary,
          cm.notificationFeedIconTile,
        )}
      >
        <span class={cm.iconGlyphFont} aria-hidden="true">
          {item().icon}
        </span>
      </div>
      <div class={cm.cn(cm.flex1, cm.minW(0))}>
        <div class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
          <h2 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{item().title}</h2>
          <span class={cm.cn(cm.textSize('xs'), cm.textMuted, cm.notificationFeedTimestamp)}>
            {fmtRelativeShort(item().createdAt)}
          </span>
        </div>
        <p class={cm.cn(cm.textSize('sm'), cm.textMuted)}>{item().body}</p>
      </div>
    </div>
  )

  return (
    <ul
      class={cm.cn(cm.notificationFeedList, props.className)}
      aria-label={props.ariaLabel}
      data-mol-id={props.dataMolId}
    >
      <For each={keyedRows()}>
        {(row): JSX.Element => (
          <li>
            <Show when={itemFor(row.id)}>
              {(item): JSX.Element => {
                /** The row's link target (empty when the row has none). */
                const href = (): string => item().href ?? ''
                return (
                  <>
                    {href() ? (
                      <Link to={href()} class={cm.displayBlock}>
                        {card(item)}
                      </Link>
                    ) : (
                      card(item)
                    )}
                  </>
                )
              }}
            </Show>
          </li>
        )}
      </For>
    </ul>
  )
}

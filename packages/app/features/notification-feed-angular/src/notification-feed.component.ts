/**
 * NotificationFeed component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { Link } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { NotificationFeedRow } from './notification-feed-row.component.js'
import type { FeedItem } from './types.js'

/**
 * NotificationFeed component.
 *
 * Vertical notification feed — typed icon + title + body + relative time, with
 * an optional unread left-border accent and an optional per-row link. The host
 * IS the outer `<ul>` (`ul[mol-notification-feed]`), matching React's root
 * exactly, so the aria-label and `data-mol-id` land on the same element.
 *
 * Each row is a `<li>` whose child is either the binding's `Link`
 * (`<a molLink>`, react-router's `<Link to>` contract) wrapping the row card,
 * or the card alone — React's `item.href ? <Link> : card` branch. Rows are
 * tracked by `item.id`, as React keys them.
 *
 * @param props - Component props (see {@link NotificationFeedProps}).
 */
@Component({
  selector: 'ul[mol-notification-feed]',
  standalone: true,
  imports: [Link, NotificationFeedRow],
  inputs: ['items', 'ariaLabel', 'className', 'dataMolId'],
  host: {
    '[class]': 'listClasses()',
    '[attr.aria-label]': 'ariaLabel ?? null',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  // prettier-ignore
  template: `@for (item of items; track item.id) {<li>@if (item.href) {<a [molLink]="item.href" [class]="linkClasses()"><div mol-notification-row [item]="item"></div></a>} @else {<div mol-notification-row [item]="item"></div>}</li>}`,
})
export class NotificationFeed {
  /** Items to render, top to bottom. */
  items: ReadonlyArray<FeedItem> = []
  /** Aria-label for the underlying `<ul>`. */
  ariaLabel?: string
  /** Extra classes on the outer `<ul>`. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the list's class list (`cm.notificationFeedList` + `className`).
   * @returns The class string.
   */
  listClasses(): string {
    return this.cm().cn(this.cm().notificationFeedList, this.className)
  }

  /**
   * Computes a linked row's anchor class list (`cm.displayBlock`).
   * @returns The class string.
   */
  linkClasses(): string {
    return this.cm().cn(this.cm().displayBlock)
  }
}

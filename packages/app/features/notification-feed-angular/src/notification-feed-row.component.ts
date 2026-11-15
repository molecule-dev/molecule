/**
 * NotificationFeedRow component (React parity) — one row's card.
 *
 * Not exported from the package: it renders the inner `<div>` React's
 * `NotificationFeed` renders for each item, with the same ClassMap tokens, so
 * the host element IS that div (selector `div[mol-notification-row]`).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { fmtRelativeShort } from './fmtRelativeShort.js'
import type { FeedItem } from './types.js'

/**
 * One notification row's card: icon tile, headline, relative time and body.
 *
 * React computes the unread accent from the item, so the card's class list is
 * read from the current `item` input on every change-detection pass.
 */
@Component({
  selector: 'div[mol-notification-row]',
  standalone: true,
  inputs: ['item'],
  host: { '[class]': 'classes()' },
  template: `<div [class]="iconTileClasses()">
      <span aria-hidden="true" [class]="iconGlyphClasses()">{{ item.icon }}</span>
    </div>
    <div [class]="bodyClasses()">
      <div [class]="headClasses()">
        <h2 [class]="titleClasses()">{{ item.title }}</h2>
        <span [class]="timestampClasses()">{{ relativeTime() }}</span>
      </div>
      <p [class]="textClasses()">{{ item.body }}</p>
    </div>`,
})
export class NotificationFeedRow {
  /** The row's data. */
  item: FeedItem = { id: '', icon: '', title: '', body: '', createdAt: '' }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the card's class list: card, padding, row layout and the unread
   * accent when the item is unread.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().card(),
      this.cm().sp('p', 4),
      this.cm().flex({ align: 'start', gap: 'md' }),
      this.item.unread ? this.cm().notificationFeedUnreadAccent : '',
    )
  }

  /**
   * Computes the icon tile's class list.
   * @returns The class string.
   */
  iconTileClasses(): string {
    return this.cm().cn(
      this.cm().shrink0,
      this.cm().flex({ align: 'center', justify: 'center' }),
      this.cm().roundedFull,
      this.cm().textPrimary,
      this.cm().notificationFeedIconTile,
    )
  }

  /**
   * Computes the icon glyph's class list.
   * @returns The class string.
   */
  iconGlyphClasses(): string {
    return this.cm().cn(this.cm().iconGlyphFont)
  }

  /**
   * Computes the body column's class list.
   * @returns The class string.
   */
  bodyClasses(): string {
    return this.cm().cn(this.cm().flex1, this.cm().minW(0))
  }

  /**
   * Computes the headline row's class list.
   * @returns The class string.
   */
  headClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', justify: 'between', gap: 'sm' }))
  }

  /**
   * Computes the headline's class list.
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('base'), this.cm().fontWeight('semibold'))
  }

  /**
   * Computes the timestamp's class list.
   * @returns The class string.
   */
  timestampClasses(): string {
    return this.cm().cn(
      this.cm().textSize('xs'),
      this.cm().textMuted,
      this.cm().notificationFeedTimestamp,
    )
  }

  /**
   * Computes the body text's class list.
   * @returns The class string.
   */
  textClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().textMuted)
  }

  /**
   * The item's timestamp as a short relative string.
   * @returns The relative time (e.g. `"3h"`).
   */
  relativeTime(): string {
    return fmtRelativeShort(this.item.createdAt)
  }
}

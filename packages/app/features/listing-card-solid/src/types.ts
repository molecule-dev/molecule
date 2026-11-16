/**
 * Types for the Solid listing / product card primitives — the Solid prop
 * shapes of `@molecule/app-listing-card-react`'s card, with Solid's JSX node
 * type.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props for {@link ListingCard}. */
export interface ListingCardProps {
  /** Slots — usually `<ListingCardMedia>` + `<ListingCardBody>` + `<ListingCardActions>`. */
  children: JSX.Element
  /**
   * Called on any click on the card — including clicks inside
   * `<ListingCardActions>`, which bubble into it unless the action handler
   * stops propagation. The DOM click event is passed the way React's DOM
   * handler receives it.
   */
  onClick?: (event: MouseEvent) => void
  /** Extra classes on the outer Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/** Props for {@link ListingCardActions}. */
export interface ListingCardActionsProps {
  /** Action content — buttons, favorite toggle, etc. */
  children: JSX.Element
  /** Layout — `'horizontal'` (default) fills width, `'stacked'` is vertical. */
  layout?: 'horizontal' | 'stacked'
  /** Extra classes. */
  className?: string
}

/** Props for {@link ListingCardBody}. */
export interface ListingCardBodyProps {
  /** Primary title / name. */
  title: JSX.Element
  /** Secondary line (subtitle, location, category). */
  subtitle?: JSX.Element
  /** Price / metric line. */
  price?: JSX.Element
  /** Optional extras row (rating, availability, badges). */
  meta?: JSX.Element
  /** Extra classes. */
  className?: string
}

/** Props for {@link ListingCardMedia}. */
export interface ListingCardMediaProps {
  /** Image URL. */
  src?: string
  /** Image alternative text (defaults to an empty string). */
  alt?: string
  /** Override with a node (video, carousel, svg). */
  children?: JSX.Element
  /** Aspect ratio (`'1/1' | '4/3' | '16/9' | '3/2'`), applied as an inline `aspect-ratio` style. Defaults to `'4/3'`. */
  aspect?: '1/1' | '4/3' | '16/9' | '3/2'
  /** Optional overlay node (badge, favorite heart). */
  overlay?: JSX.Element
  /** Extra classes. */
  className?: string
}

/** Props for {@link ListingGrid}. */
export interface ListingGridProps {
  /** Grid content — the cards. */
  children: JSX.Element
  /** Column count, fixed at every viewport width. Defaults to 3. */
  columns?: 1 | 2 | 3 | 4 | 5 | 6
  /** Gap between cards. Defaults to `'md'`. */
  gap?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes. */
  className?: string
}

/**
 * Types for the Svelte listing / product card primitives — the Svelte prop
 * shapes of `@molecule/app-listing-card-react`'s card, with Svelte's snippet
 * type for node-valued props.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/**
 * A node-valued prop inside this package (React's `ReactNode`): a snippet
 * rendering the node, or plain text. Not exported — React has no matching
 * public type, and the export surface must stay identical.
 */
type NodeValue = Snippet | string | number

/** Props for {@link ListingCard}. */
export interface ListingCardProps {
  /** Slots — usually `<ListingCardMedia>` + `<ListingCardBody>` + `<ListingCardActions>`. */
  children?: Snippet
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
  children?: Snippet
  /** Layout — `'horizontal'` (default) fills width, `'stacked'` is vertical. */
  layout?: 'horizontal' | 'stacked'
  /** Extra classes. */
  className?: string
}

/** Props for {@link ListingCardBody}. */
export interface ListingCardBodyProps {
  /** Primary title / name. */
  title: NodeValue
  /** Secondary line (subtitle, location, category). */
  subtitle?: NodeValue
  /** Price / metric line. */
  price?: NodeValue
  /** Optional extras row (rating, availability, badges). */
  meta?: NodeValue
  /** Extra classes. */
  className?: string
}

/** Props for {@link ListingCardMedia}. */
export interface ListingCardMediaProps {
  /** Image URL. */
  src?: string
  /** Image alternative text (defaults to an empty string). */
  alt?: string
  /** Override with a node (video, carousel, svg) — the default snippet. */
  children?: NodeValue
  /** Aspect ratio (`'1/1' | '4/3' | '16/9' | '3/2'`), applied as an inline `aspect-ratio` style. Defaults to `'4/3'`. */
  aspect?: '1/1' | '4/3' | '16/9' | '3/2'
  /** Optional overlay node (badge, favorite heart). */
  overlay?: NodeValue
  /** Extra classes. */
  className?: string
}

/** Props for {@link ListingGrid}. */
export interface ListingGridProps {
  /** Grid content — the cards. */
  children?: Snippet
  /** Column count, fixed at every viewport width. Defaults to 3. */
  columns?: 1 | 2 | 3 | 4 | 5 | 6
  /** Gap between cards. Defaults to `'md'`. */
  gap?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes. */
  className?: string
}

/**
 * Types of `@molecule/app-listing-card-angular` — the Angular counterpart of
 * `@molecule/app-listing-card-react`'s card, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link ListingCard} — the same props
 * `@molecule/app-listing-card-react` accepts. Node props (`children`) are
 * projected content in Angular (an input cannot carry a node), so they are
 * typed `unknown`: pass them in the host template, not as values.
 */
export interface ListingCardProps {
  /** Slots — projected as the element's default content. */
  children?: unknown
  /** Called on any click on the card (React's `onClick`, with the click event). */
  onClick?: (event: MouseEvent) => void
  /** Extra classes on the outer Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/** Props for {@link ListingCardActions}. */
export interface ListingCardActionsProps {
  /** Action content — buttons, favorite toggle, etc. Projected content. */
  children?: unknown
  /** Layout — `'horizontal'` (default) fills width, `'stacked'` is vertical. */
  layout?: 'horizontal' | 'stacked'
  /** Extra classes. */
  className?: string
}

/** Props for {@link ListingCardBody}. Node rows are projected content (`[slot=<name>]`) or text inputs. */
export interface ListingCardBodyProps {
  /** Primary title / name, a text input or `[slot=title]` content. */
  title?: unknown
  /** Secondary line (subtitle, location, category), a text input or `[slot=subtitle]` content. */
  subtitle?: unknown
  /** Price / metric line, a text input or `[slot=price]` content. */
  price?: unknown
  /** Optional extras row (rating, availability, badges), a text input or `[slot=meta]` content. */
  meta?: unknown
  /** Extra classes. */
  className?: string
}

/** Props for {@link ListingCardMedia}. */
export interface ListingCardMediaProps {
  /** Image URL. */
  src?: string
  /** Image alternative text (defaults to an empty string). */
  alt?: string
  /** Override with a node (video, carousel, svg), projected as the default content. */
  children?: unknown
  /** Aspect ratio (`'1/1' | '4/3' | '16/9' | '3/2'`), applied as an inline `aspect-ratio` style. Defaults to `'4/3'`. */
  aspect?: '1/1' | '4/3' | '16/9' | '3/2'
  /** Optional overlay node (badge, favorite heart), projected as `[slot=overlay]` content. */
  overlay?: unknown
  /** Extra classes. */
  className?: string
}

/** Props for {@link ListingGrid}. */
export interface ListingGridProps {
  /** Grid content — the cards. Projected content. */
  children?: unknown
  /** Column count, fixed at every viewport width. Defaults to 3. */
  columns?: 1 | 2 | 3 | 4 | 5 | 6
  /** Gap between cards. Defaults to `'md'`. */
  gap?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes. */
  className?: string
}

/**
 * Types of `@molecule/app-listing-card-angular` — the Angular counterpart of
 * `@molecule/app-listing-card-react`'s card, same props and DOM.
 *
 * @module
 */

import type { ButtonSize, ButtonVariant, ColorVariant } from '@molecule/app-ui'

/** A server-backed card action with the total number of people who selected it. */
export interface ListingCardToggleProps {
  /** The pressed state and count from the same loaded record. */
  value: { pressed: boolean; count: number }
  /** Saves the desired state and returns the server-confirmed state and count together. */
  commit: (desired: boolean) => Promise<ListingCardToggleProps['value']>
  /** Label when the displayed value is true. */
  activeLabel: string | number
  /** Label when the displayed value is false. */
  inactiveLabel: string | number
  /** Receives a failed save after the toggle put the last confirmed state and count back. */
  onError?: (error: unknown) => void
  /** Overrides the button's default `data-mol-id`. */
  dataMolId?: string
  /** Button variant (defaults to `'solid'` while pressed, `'outline'` otherwise). */
  variant?: ButtonVariant
  /** Button color. */
  color?: ColorVariant
  /** Button size. */
  size?: ButtonSize
  /** Whether the button stretches to fill its container. */
  fullWidth?: boolean
  /** Disables the button (permissions, never a pending save). */
  disabled?: boolean
  /** Extra classes on the button. */
  className?: string
  /** `data-testid` for the button. */
  testId?: string
  /** `data-mol-id` automation id; wins over `dataMolId` (React's precedence). */
  automationId?: string
}

/**
 * Props accepted by {@link ListingCard} — the same props
 * `@molecule/app-listing-card-react` accepts. Node props (`children`) are
 * projected content in Angular (an input cannot carry a node), so they are
 * typed `unknown`: pass them in the host template, not as values.
 */
export interface ListingCardProps {
  /** Slots — projected as the element's default content. */
  children?: unknown
  /** Renders a counted native toggle after the content, outside any links in the content. */
  toggle?: ListingCardToggleProps
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

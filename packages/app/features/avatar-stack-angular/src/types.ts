/**
 * Types of `@molecule/app-avatar-stack-angular` — the Angular counterpart of
 * `@molecule/app-avatar-stack-react`, same props and DOM.
 *
 * @module
 */

/** Represents a single person entry rendered inside an AvatarStack. */
export interface AvatarStackPerson {
  /** Display name (also used to generate the text fallback). */
  name: string
  /** Optional avatar image URL. */
  src?: string
  /** Optional alt text — defaults to `name`. */
  alt?: string
}

/**
 * Props accepted by {@link AvatarStack} — the same props
 * `@molecule/app-avatar-stack-react` accepts. The list itself is the `people`
 * input, so every prop is bindable.
 */
export interface AvatarStackProps {
  /** People to render. */
  people: AvatarStackPerson[]
  /** Maximum visible avatars. Remaining are summarised in an "overflow" chip. */
  max?: number
  /** Avatar size preset. */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes on the outer stack. */
  className?: string
}

/**
 * Props accepted by {@link UserChip} — the same props
 * `@molecule/app-avatar-stack-react` accepts. Node props (`subtitle`,
 * `trailing`) are projected content in Angular (an input cannot carry a node),
 * so they are typed `unknown`: pass them in the host template, projected as
 * `[slot=subtitle]` / `[slot=trailing]`.
 */
export interface UserChipProps {
  /** Display name. */
  name: string
  /** Optional avatar image URL. */
  src?: string
  /** Optional secondary line (role / email / handle), projected as `[slot=subtitle]` content. */
  subtitle?: unknown
  /** Optional trailing content (action button, status dot, etc.), projected as `[slot=trailing]` content. */
  trailing?: unknown
  /** Avatar size preset. */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes on the outer row. */
  className?: string
}

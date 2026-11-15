/**
 * Types for the Svelte avatar stack and user chip.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Represents a single person entry rendered inside an AvatarStack. */
export interface AvatarStackPerson {
  /** Display name (also used to generate the text fallback). */
  name: string
  /** Optional avatar image URL. */
  src?: string
  /** Optional alt text — defaults to `name`. */
  alt?: string
}

/** Props accepted by the {@link AvatarStack} component. */
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
 * Props accepted by the {@link UserChip} component — the same props
 * `@molecule/app-avatar-stack-react` accepts. Node props are snippets or plain
 * strings.
 */
export interface UserChipProps {
  /** Display name. */
  name: string
  /** Optional avatar image URL. */
  src?: string
  /** Optional secondary line (role / email / handle; a string or a snippet). */
  subtitle?: Snippet | string
  /** Optional trailing content (action button, status dot, etc.; a snippet). */
  trailing?: Snippet
  /** Avatar size preset. */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes on the outer row. */
  className?: string
}

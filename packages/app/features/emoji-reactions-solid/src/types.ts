/**
 * Types for the Solid emoji reaction bar — the same props
 * `@molecule/app-emoji-reactions-react` accepts.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Represents a single emoji reaction with its aggregated count and current-user state. */
export interface EmojiReaction {
  emoji: string
  count: number
  /** Whether the current user reacted with this emoji. */
  reactedByMe?: boolean
}

/** Props accepted by the {@link EmojiReactions} component. */
export interface EmojiReactionsProps {
  reactions: EmojiReaction[]
  /** Called when a reaction chip is toggled by the current user. */
  onToggle?: (emoji: string) => void
  /** Quick-pick emojis offered when "+" is clicked. */
  quickPicks?: string[]
  /** Called when the user picks a new emoji. */
  onAdd?: (emoji: string) => void
  /** Optional wrapper class. */
  className?: string
  /**
   * Optional custom tooltip content shown on hover / focus of a reaction chip
   * (e.g. an avatar list of who reacted). When provided, it replaces the
   * default "{count} reactions" title. Returning a nullish value falls back to
   * the default title for that chip.
   */
  renderTooltip?: (r: EmojiReaction) => JSX.Element
}

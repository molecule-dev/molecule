/**
 * Types of `@molecule/app-emoji-reactions-angular` — the Angular counterpart
 * of `@molecule/app-emoji-reactions-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/** Represents a single emoji reaction with its aggregated count and current-user state. */
export interface EmojiReaction {
  emoji: string
  count: number
  /** Whether the current user reacted with this emoji. */
  reactedByMe?: boolean
}

/** Props accepted by {@link EmojiReactions} — the same props React's accepts. */
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
   * (e.g. an avatar list of who reacted). It is an `ng-template` receiving the
   * chip's reaction as `$implicit` / `a0`, and it replaces the default
   * "{count} reactions" title. A template is either provided or absent, so a
   * chip keeps the default title when no template is passed.
   */
  renderTooltip?: TemplateRef<unknown> | null
}

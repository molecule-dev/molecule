/**
 * Shared visual treatment for the boxed "info" cards in the Synthase chat
 * timeline (the notice / tip / upgrade card, the activity card, and the `/help`,
 * `/settings`, `/skills`, `/scripts` slash-command cards).
 *
 * These cards used to drift — some sat on a flat gray `surfaceSecondary` surface,
 * others on a tinted background; icon sizes, paddings and radii differed; and the
 * notice card carried a 3px left accent bar while the rest had a plain 1px frame.
 * This module is the single source of truth that makes them one consistent family:
 *
 * - a subtle color-mix **tint** (never a flat gray surface),
 * - a full **1px border on ALL sides** — never a thicker left accent bar,
 * - one padding, one radius, one leading-icon size.
 *
 * A single `accent` colour drives both the border and the background via
 * `color-mix` (works with a CSS var OR a hex), so a semantic card passes its tone
 * colour (success green, upgrade gold, …) and a neutral info card passes the
 * default (the theme's primary). The tint stays subtle and recolors with the
 * active theme/brand instead of clashing with it.
 *
 * Do NOT layer a `borderLeft` / left-accent override on top of {@link chatCardStyle}
 * — the whole point is a uniform 1px frame. Callers own only layout
 * (`display`/`gap`/`alignItems`) and the bottom-margin timeline rhythm.
 *
 * @module
 */

import type { CSSProperties } from 'react'

/**
 * Neutral accent for non-semantic info cards: the theme's primary colour, so a
 * card that has no status meaning is still subtly *tinted* (never a flat gray
 * surface) and recolors with the brand.
 */
export const CHAT_CARD_NEUTRAL_ACCENT = 'var(--mol-color-primary, #6366f1)'

/** Uniform leading-icon size (px) for every chat-timeline info card. */
export const CHAT_CARD_ICON_SIZE = 18

/**
 * Width (px) of the leading "media column" every boxed timeline item reserves for
 * its avatar/icon. It equals the user-avatar size, so a full-size 36px avatar fills
 * it exactly while a smaller {@link CHAT_CARD_ICON_SIZE} icon sits centered within
 * it — the point being that EVERY boxed item's text starts at the same column
 * (`padding-left + CHAT_MEDIA_COL + CHAT_MEDIA_GAP`), so user messages, auto-sent
 * messages and info cards all line up on one left edge without shrinking the avatar.
 */
export const CHAT_MEDIA_COL = 36

/** Gap (px) between the leading media column and the content column. */
export const CHAT_MEDIA_GAP = 4

/**
 * Style for the fixed-width wrapper that holds a card's leading icon so it occupies
 * the same {@link CHAT_MEDIA_COL} column as a full-size avatar (icon centered in the
 * column, top-aligned within the row). Wrap `<Icon .../>` in a `<span>`/`<div>` with
 * this style; a 36px avatar needs no wrapper since it already fills the column.
 *
 * @returns The media-column wrapper `style`.
 */
export function chatMediaColStyle(): CSSProperties {
  return {
    width: CHAT_MEDIA_COL,
    flexShrink: 0,
    display: 'inline-flex',
    justifyContent: 'center',
  }
}

/**
 * Build the tinted border colour for a chat info card from its accent.
 *
 * @param accent - Accent source colour (CSS var or hex). Defaults to the theme primary.
 * @param pct - Opacity of the accent in the mix (percent). Defaults to the resting 40.
 * @returns A `color-mix` border colour.
 */
export function chatCardBorder(accent: string = CHAT_CARD_NEUTRAL_ACCENT, pct = 40): string {
  return `color-mix(in srgb, ${accent} ${pct}%, transparent)`
}

/**
 * Build the tinted background colour for a chat info card from its accent.
 *
 * @param accent - Accent source colour (CSS var or hex). Defaults to the theme primary.
 * @param pct - Opacity of the accent in the mix (percent). Defaults to the resting 10.
 * @returns A `color-mix` background colour.
 */
export function chatCardBg(accent: string = CHAT_CARD_NEUTRAL_ACCENT, pct = 10): string {
  return `color-mix(in srgb, ${accent} ${pct}%, transparent)`
}

/**
 * The single container chrome shared by every boxed info card in the chat
 * timeline: subtle tint, full 1px border on all sides, one padding, one radius.
 *
 * Spread it first, then add layout (`display`/`gap`/`alignItems`) and the
 * bottom-margin rhythm at the call site — e.g.
 * `style={{ display: 'flex', gap: 10, marginBottom: TIMELINE_ITEM_GAP, ...chatCardStyle(accent) }}`.
 *
 * @param accent - Tint/border source colour. Defaults to the theme primary (neutral cards).
 * @returns The container `style` chrome (border, background, padding, radius).
 */
export function chatCardStyle(accent: string = CHAT_CARD_NEUTRAL_ACCENT): CSSProperties {
  return {
    // Tight 4px left/right padding; 10px vertical rhythm kept.
    padding: '10px 4px',
    borderRadius: 8,
    border: `1px solid ${chatCardBorder(accent)}`,
    background: chatCardBg(accent),
  }
}

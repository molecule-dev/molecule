/**
 * UI constants of the IDE chat panel: the inline card styles, the injected
 * user-message accent stylesheet, attachment limits, and the timeline spacing
 * and notice-tone tables. Shared verbatim by every framework's chat panel
 * (React's `ChatPanel` re-exports them through `@molecule/app-ide-react`).
 *
 * @module
 */

import type { IconName } from '@molecule/app-icons'

import type { ChatEventCardAction } from '../customEventCards.js'

/** Subtle inline monospace code style for command/identifier spans in chat cards. */
export const CHAT_CARD_CODE_STYLE: ChatCardCodeStyle = {
  fontFamily: 'var(--mol-font-mono, monospace)',
  fontSize: '0.92em',
  padding: '1px 5px',
  borderRadius: 4,
  background: 'rgba(128,128,128,0.16)',
  border: '1px solid rgba(128,128,128,0.18)',
  whiteSpace: 'nowrap',
}

/** Inline monospace code style for command/identifier spans in chat cards. */
export interface ChatCardCodeStyle {
  /** Monospace font stack. */
  fontFamily: string
  /** Slightly smaller than the card body text. */
  fontSize: string
  /** Tight padding around the code span. */
  padding: string
  /** Corner radius in pixels. */
  borderRadius: number
  /** Subtle gray chip background. */
  background: string
  /** The 1px chip frame. */
  border: string
  /** Commands never wrap inside a chat card line. */
  whiteSpace: string
}

/** Inline link style for action segments in chat cards (theme primary, underlined). */
export const CHAT_CARD_LINK_STYLE: ChatCardLinkStyle = {
  color: 'var(--color-primary, #4070e0)',
  textDecoration: 'underline',
  cursor: 'pointer',
}

/** Inline link style for action segments in chat cards. */
export interface ChatCardLinkStyle {
  /** The theme primary, so a link reads clickable in any theme. */
  color: string
  /** Underline — the affordance that says "clickable". */
  textDecoration: string
  /** Pointer cursor. */
  cursor: string
}

/**
 * User-message accent stripe. The left edge of a real user message draws a vertical,
 * multi-tone BLUE gradient swept gently up and down (the same smooth single-gradient
 * technique as the composer ring, but vertical + blue) — NOT a repeating barber-pole,
 * which read busy + janky. The host supplies the curated blues via
 * `--mol-chat-accent-gradient`; the fallback is a lightened primary so it stays blue +
 * never dark in any theme (the theme's primary-light/-dark tokens are actually a medium
 * + a dark blue with no light tone). It's a full-box gradient (so the sweep has room to
 * travel) clipped to a 3px LEFT band that follows the row's rounded corners. A
 * `::before` + its keyframe can't be expressed inline (and inline `animation` can't be
 * media-queried), so — like AutoCommitBadge — it is injected once and gated on the
 * existing `data-mol-id`; the auto-sent row keeps its solid success accent.
 */
export const USER_ACCENT_STYLE = `
[data-mol-id="chat-user-message"] { position: relative; }
[data-mol-id="chat-user-message"]::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--mol-chat-accent-gradient, linear-gradient(to bottom, color-mix(in srgb, var(--mol-color-primary, #3060c0) 85%, #fff), color-mix(in srgb, var(--mol-color-primary, #3060c0) 50%, #fff) 50%, color-mix(in srgb, var(--mol-color-primary, #3060c0) 85%, #fff)));
  background-size: 100% 300%;
  animation: mol-chat-accent-flow 6s ease-in-out infinite;
  -webkit-mask: linear-gradient(to right, #000 3px, transparent 3px);
  mask: linear-gradient(to right, #000 3px, transparent 3px);
  pointer-events: none;
}
@keyframes mol-chat-accent-flow {
  0%, 100% { background-position: 50% 0%; }
  50% { background-position: 50% 100%; }
}
@media (prefers-reduced-motion: reduce) {
  [data-mol-id="chat-user-message"]::before { animation: none; }
}`

/** Maximum file size for attachments (20 MB). */
export const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024

/** MIME types accepted by the file input for AI provider attachments. */
export const ACCEPTED_FILE_TYPES =
  'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,application/pdf,audio/mpeg,audio/wav,audio/ogg,audio/flac,audio/webm,video/mp4,video/webm'

/** Height threshold (px) above which user messages get collapsed. */
export const USER_MSG_COLLAPSE_HEIGHT = 150

/**
 * Distance from the top (px) at which scrolling up pages in older timeline
 * items. Same idea as the 80px bottom threshold of the stick-to-bottom
 * detector: a margin, so the trigger fires while the user is still moving,
 * not only pinned exactly at scrollTop 0.
 */
export const LOAD_EARLIER_THRESHOLD_PX = 120

// The single source of truth for the version this IDE reports — used BOTH by the
// `/version` command output AND by the `/version` entry's description in the
// slash-command menu (so the menu shows the real number, not a stale literal).
//
// This shared package owns no product branding, and there is currently no
// `version` prop on ChatPanelProps (and `types.ts` is owned elsewhere), so this
// is the minimal in-package wiring: one constant the menu + the command both
// read. When the host's real build version becomes available via a prop, point
// both sites at that prop instead of this fallback — the menu interpolation
// (`{{version}}`) already flows through, so only the value source changes.

/**
 * The version this IDE reports — read by the `/version` command output AND the
 * `/version` entry's description in the slash-command menu, so the menu shows
 * the real number, not a stale literal.
 */
export const APP_VERSION = '0.1.0'

// ONE convention for EVERY item rendered into the chat timeline — message rows,
// the "Now using <model>" / "Switched to <mode>" / "Building your app" system
// cards, toned-tip + emphasized cards, commit cards, activity cards:
//
//   1. Each timeline item owns its spacing as a SINGLE BOTTOM MARGIN only.
//   2. NO timeline item sets a TOP margin — and NEVER a NEGATIVE one.
//
// The gap between any two stacked items is therefore exactly the upper item's
// bottom margin (no margin-collapsing surprises, no negatives), so adjacent
// items can never collide. The scale follows the 8px grid (DESIGN.md): 16px is
// the standard rhythm unit; discovery messages get a roomier 24px (kept
// intentional, but consistent).
//
// Why bottom-margin-only with no negatives: the old code gave a message
// `marginTop: -12px` whenever it shared a role with the *previous message*
// (computed from `prevMsg`, which skips intervening cards). In the timeline DOM
// a system card often sits between two same-role assistant messages, so that
// -12px yanked the message UP over the card's 10px bottom margin — net -2px,
// i.e. the message visually ATE the "Now using <model>" card's bottom spacing
// (the exact collision reported in P4-05). Removing the negative and giving
// every item the same bottom margin fixes it at the root for ALL item pairs.

/** Standard bottom margin (px) every chat-timeline item owns. 8px-grid rhythm unit. */
export const TIMELINE_ITEM_GAP = 16

/** Roomier bottom margin (px) for discovery-phase message cards (intentionally looser). */
export const TIMELINE_ITEM_GAP_DISCOVERY = 24

/**
 * Accent (success green) for an auto-sent message card — drives its tint, 1px border
 * and `sync` icon via {@link chatCardStyle}, so an agent-sent message is unmistakably
 * green while sharing the exact card shape of the user message and info cards.
 */
export const AUTO_SENT_ACCENT = 'var(--mol-color-success, #16a34a)'

/** The accent + default icon per notice tone, keyed by tone id. */
export const NOTICE_TONE: Record<
  'info' | 'gold' | 'upgrade' | 'success' | 'signup',
  { accent: string; icon: IconName }
> = {
  info: { accent: 'var(--mol-color-primary, #6366f1)', icon: 'info-circle' },
  gold: { accent: '#e0a100', icon: 'lightbulb' },
  // Limit / degraded / budget / upgrade notices: a `clock` icon — an OUTLINE ring
  // built exactly like `info-circle`, so it matches the other tone icons' weight
  // (the solid `exclamation-triangle`/`sparkle` glyphs read far heavier). The accent
  // is the theme WARNING token so the border stays visible on light backgrounds too.
  upgrade: { accent: 'var(--mol-color-warning, #e0a100)', icon: 'clock' },
  success: { accent: '#3fb950', icon: 'check-circle' },
  signup: { accent: 'var(--mol-color-primary, #6366f1)', icon: 'sign-in' },
}

/**
 * The SEMANTIC button colour each notice tone falls back to when the host gives
 * an action no explicit `color`. Every notice-card action is a design-system
 * button; this is only about which semantic it takes when the caller did not
 * say. Without it a coloured action and a colourless one rendered side by side
 * in the SAME card with two different box models (13px/3px vs a hand-rolled
 * 12px/6px) — the exact mismatch this treatment exists to prevent.
 */
export const NOTICE_TONE_BUTTON_COLOR: Record<
  'info' | 'gold' | 'upgrade' | 'success' | 'signup',
  NonNullable<ChatEventCardAction['color']>
> = {
  info: 'primary',
  gold: 'warning',
  upgrade: 'warning',
  success: 'success',
  signup: 'primary',
}

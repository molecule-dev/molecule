/**
 * Registry for app-specific custom chat-stream events.
 *
 * The shared chat UI (ChatPanel) only understands generic events. To surface an
 * app-specific event — emitted by a backend as `{ type: 'custom', name, data }`
 * (see `@molecule/app-ai-chat`) — without coupling this package to that app, the
 * consuming app registers a factory that turns the event's `data` into a chat system
 * card. ChatPanel consults this registry when a `custom` event arrives. This is the
 * sanctioned extension point: app-specific events/cards (e.g. a host app's build or
 * billing notices) live in the app, never in this shared package's union or ChatPanel.
 *
 * @module
 */

/**
 * A single call-to-action on a chat card: a labelled link (`href`) and/or click
 * handler. The app supplies any route/copy — the shared package never hardcodes one.
 */
export interface ChatEventCardAction {
  /** Button label (already localized by the app). */
  label: string
  /** Link target. App-owned — e.g. the host's own pricing/auth route. */
  href?: string
  /** Click handler (alternative to, or alongside, `href`). */
  onClick?: () => void
  /**
   * Render the action's label as inline monospace code — a command/identifier like
   * `/report` or a skill name — so it stands out from prose while staying clickable.
   */
  code?: boolean
}

/**
 * A non-interactive inline monospace code span in a card body — a command or identifier
 * the prose refers to (`/report`, a skill name) that should read as code but isn't
 * clickable. For a *clickable* command, use {@link ChatEventCardAction} with `code: true`.
 */
export interface ChatEventCardCode {
  /** The code text, rendered monospaced/tinted. */
  code: string
}

/**
 * One inline segment of a card's composable body: literal text, an inline monospace
 * {@link ChatEventCardCode} span, or a labelled link/action ({@link ChatEventCardAction}).
 * See {@link ChatEventCard.content}.
 */
export type ChatEventCardSegment = string | ChatEventCardCode | ChatEventCardAction

/**
 * A chat system card: a short message with an optional action (or actions). Mirrors
 * the system-card shape ChatPanel renders for upgrade prompts, guest reminders, etc.
 */
export interface ChatEventCard {
  /** The card's text. */
  text: string
  /** An optional action button (or buttons): a link (`href`) and/or a click handler. */
  action?: ChatEventCardAction | ChatEventCardAction[]
  /**
   * Composable inline body for a `tone` (tip) card: an ordered list of segments rendered
   * in sequence — plain strings as text, {@link ChatEventCardAction}s as inline underlined
   * links — so prose and links interleave freely (e.g. text → an inline link → a trailing
   * period). When set, the renderer uses this INSTEAD of `text` + appended `action`s, so a
   * link can sit mid-sentence rather than only at the end. Segments carry their own spacing
   * (no auto-space is inserted between them). Keep `text` populated with a plain-text
   * equivalent for accessibility / non-toned consumers. Only honored when `tone` is set.
   */
  content?: ChatEventCardSegment[]
  /**
   * When true, ChatPanel renders the card in its emphasized (highlighted box) style
   * instead of the muted inline style — e.g. a sign-up / upgrade nudge the app wants
   * to stand out. The app opts in; the shared package never infers emphasis from a
   * card's route or copy.
   */
  emphasized?: boolean
  /**
   * Optional tip-style tone: `'info'` (blue) or `'gold'`. When set, ChatPanel renders
   * the card in the dismissable tip-box style (rounded, tinted, with a lightbulb glyph)
   * in that tone, and renders any `action`(s) as inline underlined links rather than
   * buttons — for low-key, honest notices (e.g. a "what powers this" model note). The
   * app opts in; omit for the default muted / emphasized styles.
   */
  tone?: 'info' | 'gold'
}

/**
 * Turns a custom event's `data` payload into a chat card, or returns null to render
 * nothing for that event.
 */
export type ChatEventCardFactory = (
  data: Record<string, unknown> | undefined,
) => ChatEventCard | null

const registry = new Map<string, ChatEventCardFactory>()

/**
 * Register a renderer for a custom chat-stream event. Consuming apps call this at
 * startup so their own `{ type: 'custom', name }` events surface as chat cards —
 * keeping app-specific events out of the core ai-chat union and this package's
 * ChatPanel. Re-registering the same name overwrites the previous factory.
 *
 * @param name - The custom event `name` to handle (matches the emitted event's `name`).
 * @param factory - Builds the card from the event's `data` (or returns null to skip).
 */
export function registerCustomEventCard(name: string, factory: ChatEventCardFactory): void {
  registry.set(name, factory)
}

/**
 * Resolve the registered card factory for a custom event name, if any.
 *
 * @param name - The custom event `name`.
 * @returns The registered factory, or undefined if none is registered.
 */
export function getCustomEventCardFactory(name: string): ChatEventCardFactory | undefined {
  return registry.get(name)
}

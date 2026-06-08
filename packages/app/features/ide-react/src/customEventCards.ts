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
 * A chat system card: a short message with an optional action (or actions). Mirrors
 * the system-card shape ChatPanel renders for upgrade prompts, guest reminders, etc.
 */
export interface ChatEventCard {
  /** The card's text. */
  text: string
  /** An optional action button (or buttons): a link (`href`) and/or a click handler. */
  action?:
    | { label: string; href?: string; onClick?: () => void }
    | { label: string; href?: string; onClick?: () => void }[]
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

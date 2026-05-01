/**
 * Type definitions for the Discord channel provider.
 *
 * @module
 */

/**
 * Configuration for the Discord channel provider.
 *
 * Discord uses two distinct credentials:
 *
 * - {@link botToken} — used as the `Authorization: Bot <token>` header for
 *   REST calls (sending messages, fetching channels, etc.). Required to
 *   send messages.
 * - {@link publicKey} — the application's hex-encoded ed25519 public key,
 *   used to verify the signature on inbound interaction webhook requests.
 *   Required to verify webhooks.
 *
 * Either credential may be omitted at construction time and supplied via
 * environment variables (`CHANNEL_DISCORD_BOT_TOKEN`,
 * `CHANNEL_DISCORD_PUBLIC_KEY`).
 */
export interface DiscordConfig {
  /**
   * Bot token for the Discord application. Used as the `Bot <token>`
   * authentication header on REST calls. Defaults to the
   * `CHANNEL_DISCORD_BOT_TOKEN` environment variable.
   */
  botToken?: string

  /**
   * Application public key (hex-encoded ed25519) used to verify inbound
   * interaction webhook signatures. Defaults to the
   * `CHANNEL_DISCORD_PUBLIC_KEY` environment variable.
   */
  publicKey?: string

  /**
   * Optional override for the Discord REST API base URL. Defaults to
   * `https://discord.com/api/v10`. Primarily useful for testing.
   */
  apiBaseUrl?: string

  /**
   * Optional REST client. If provided, the bond delegates message sends to
   * it (e.g. an instance of `discord.js`'s `REST`). When omitted, the bond
   * falls back to a built-in `fetch` implementation. Primarily useful for
   * tests that need to mock the `discord.js` client without having a live
   * dependency.
   */
  rest?: DiscordRestLike

  /**
   * Optional request timeout for built-in REST calls in milliseconds.
   * Defaults to `10000`. Ignored when {@link rest} is supplied.
   */
  timeoutMs?: number
}

/**
 * Minimal REST-client shape the provider depends on. Compatible with the
 * `REST` class from `discord.js` (`new REST().setToken(token).post(...)`).
 */
export interface DiscordRestLike {
  /**
   * Issues a POST request against the Discord REST API at the given route.
   *
   * @param route - REST route relative to the Discord API base (e.g.
   *   `'/channels/123/messages'`).
   * @param options - Request options including a JSON-serialisable body.
   * @returns The parsed JSON response.
   */
  post(route: string, options: { body: unknown }): Promise<unknown>
}

/**
 * Environment variables consumed by the Discord channel provider.
 */
export interface ProcessEnv {
  /** Bot token used for REST authentication. */
  CHANNEL_DISCORD_BOT_TOKEN: string
  /** Application public key (hex-encoded) used for webhook verification. */
  CHANNEL_DISCORD_PUBLIC_KEY: string
}

/**
 * Discord interaction types relevant to inbound webhook parsing.
 *
 * Mirrors the subset of Discord's `InteractionType` enum used by this
 * bond:
 *
 * - `1` — `PING` (handshake; not converted to an InboundMessage).
 * - `2` — `APPLICATION_COMMAND` (slash command).
 * - `3` — `MESSAGE_COMPONENT` (button click, select-menu, etc.).
 *
 * Any other types (modal submit, autocomplete, …) are passed through as
 * the original payload and treated as an empty inbound message.
 */
export type DiscordInteractionType = 1 | 2 | 3 | number

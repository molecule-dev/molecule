/**
 * Neutral, app-agnostic identity for the AI coding agent and the host product.
 *
 * The shared chat/IDE packages (`@molecule/app-react`, `@molecule/app-ide-react`)
 * must never hardcode a specific product's agent name or product name in
 * user-facing copy — a *different* app embedding them would inherit the wrong
 * branding (molecule AGENTS.md anti-pattern 14 / the leaks-in-core audit).
 * Instead, shared UI strings interpolate the i18n tokens `{{agentName}}` /
 * `{{productName}}`, and the host supplies its own values via
 * `useChat({ agentName })` and `<ChatPanel agentName productName />`.
 *
 * These NEUTRAL defaults apply when the host passes nothing, so the package on
 * its own never names a specific product — it reads as "the assistant" / "the
 * IDE" until a consuming app sets its own identity.
 *
 * @module
 */

/**
 * Display identity for the AI coding agent and the host product, used to
 * interpolate the `{{agentName}}` / `{{productName}}` tokens in shared chat/IDE
 * copy. A consuming app sets these to its own agent + product brand names; the
 * shared packages fall back to {@link DEFAULT_AGENT_IDENTITY} when it does not.
 */
export interface AgentIdentity {
  /** Display name of the AI coding agent. Defaults to {@link DEFAULT_AGENT_NAME}. */
  agentName: string
  /** Display name of the host product / IDE. Defaults to {@link DEFAULT_PRODUCT_NAME}. */
  productName: string
}

/** Neutral, product-agnostic agent name used when the host supplies none. */
export const DEFAULT_AGENT_NAME = 'the assistant'

/** Neutral, product-agnostic product/IDE name used when the host supplies none. */
export const DEFAULT_PRODUCT_NAME = 'the IDE'

/**
 * The neutral default identity ({@link DEFAULT_AGENT_NAME} +
 * {@link DEFAULT_PRODUCT_NAME}) the shared packages use until a consuming app
 * passes its own.
 */
export const DEFAULT_AGENT_IDENTITY: AgentIdentity = {
  agentName: DEFAULT_AGENT_NAME,
  productName: DEFAULT_PRODUCT_NAME,
}

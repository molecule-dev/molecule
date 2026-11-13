/**
 * Neutral, app-agnostic identity for the AI coding agent and the host product.
 *
 * Defined once in `@molecule/app-ai-chat` (the chat session interpolates the
 * agent name into its own copy) and re-exported here under the same names as
 * `@molecule/app-react`. Shared UI strings interpolate the i18n tokens
 * `{{agentName}}` / `{{productName}}`, and the host supplies its own values via
 * `useChat({ agentName })`; these NEUTRAL defaults apply when it passes nothing.
 *
 * @module
 */

import type { AgentIdentity as ChatAgentIdentity } from '@molecule/app-ai-chat'
import {
  DEFAULT_AGENT_IDENTITY as CHAT_DEFAULT_AGENT_IDENTITY,
  DEFAULT_AGENT_NAME as CHAT_DEFAULT_AGENT_NAME,
  DEFAULT_PRODUCT_NAME as CHAT_DEFAULT_PRODUCT_NAME,
} from '@molecule/app-ai-chat'

/**
 * Display identity for the AI coding agent and the host product, used to
 * interpolate the `{{agentName}}` / `{{productName}}` tokens in shared chat/IDE
 * copy. A consuming app sets these to its own agent + product brand names; the
 * shared packages fall back to {@link DEFAULT_AGENT_IDENTITY} when it does not.
 */
export type AgentIdentity = ChatAgentIdentity

/** Neutral, product-agnostic agent name used when the host supplies none. */
export const DEFAULT_AGENT_NAME: typeof CHAT_DEFAULT_AGENT_NAME = CHAT_DEFAULT_AGENT_NAME

/** Neutral, product-agnostic product/IDE name used when the host supplies none. */
export const DEFAULT_PRODUCT_NAME: typeof CHAT_DEFAULT_PRODUCT_NAME = CHAT_DEFAULT_PRODUCT_NAME

/**
 * The neutral default identity ({@link DEFAULT_AGENT_NAME} +
 * {@link DEFAULT_PRODUCT_NAME}) the shared packages use until a consuming app
 * passes its own.
 */
export const DEFAULT_AGENT_IDENTITY: AgentIdentity = CHAT_DEFAULT_AGENT_IDENTITY

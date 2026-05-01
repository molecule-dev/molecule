/**
 * Type definitions for the Slack channel provider.
 *
 * @module
 */

/**
 * Configuration for the Slack channel provider.
 *
 * Tokens default to environment variables when not supplied so deployment
 * pipelines that already inject `SLACK_BOT_TOKEN` / `SLACK_SIGNING_SECRET`
 * keep working without extra wiring.
 */
export interface SlackChannelConfig {
  /**
   * Bot user OAuth token used for `chat.postMessage` and other Web API
   * calls. Defaults to `process.env.SLACK_BOT_TOKEN`.
   */
  botToken?: string

  /**
   * Slack app signing secret used to verify the HMAC of inbound webhook
   * requests. Defaults to `process.env.SLACK_SIGNING_SECRET`.
   */
  signingSecret?: string

  /**
   * Maximum allowed clock skew (in seconds) between the request timestamp
   * and the verifier when validating `x-slack-signature`. Defaults to 300
   * seconds (5 minutes), matching Slack's documented replay window.
   */
  signatureToleranceSeconds?: number

  /**
   * Optional pre-built `WebClient`-shaped object. Tests inject a minimal
   * mock here; production code should leave this unset and let the
   * provider construct its own client from {@link botToken}.
   */
  webClient?: SlackWebClientLike
}

/**
 * The narrow surface of `@slack/web-api`'s `WebClient` that this provider
 * actually uses. Defining it explicitly keeps tests free of the full SDK
 * type tree and documents the integration contract.
 */
export interface SlackWebClientLike {
  chat: {
    postMessage(args: SlackChatPostMessageArgs): Promise<SlackChatPostMessageResponse>
  }
}

/**
 * Subset of `chat.postMessage` arguments consumed by this provider.
 */
export interface SlackChatPostMessageArgs {
  channel: string
  text?: string
  blocks?: SlackBlock[]
  thread_ts?: string
  attachments?: SlackOutboundAttachment[]
}

/**
 * Minimal shape of a Slack Block Kit block as used by this provider.
 * Slack's full block schema is large; we only constrain the fields we
 * emit (`section` and `actions`) and treat the rest as opaque pass-through.
 */
export interface SlackBlock {
  type: string
  text?: { type: string; text: string }
  elements?: Array<{
    type: string
    text?: { type: string; text: string }
    value?: string
    action_id?: string
  }>
}

/**
 * Subset of `chat.postMessage` response fields consumed by this provider.
 */
export interface SlackChatPostMessageResponse {
  ok: boolean
  ts?: string
  channel?: string
  error?: string
}

/**
 * Slack-flavoured outbound attachment (legacy attachments API). Used as a
 * pass-through for callers that already speak Slack's attachment shape.
 */
export interface SlackOutboundAttachment {
  fallback?: string
  text?: string
  title?: string
  title_link?: string
  image_url?: string
  thumb_url?: string
  color?: string
}

/**
 * Environment variables consumed by the Slack channel provider.
 */
export interface ProcessEnv {
  /**
   * Bot user OAuth token (xoxb-…). Required for outbound `sendMessage`.
   */
  SLACK_BOT_TOKEN: string

  /**
   * Slack app signing secret. Required for `verifyWebhookSignature`.
   */
  SLACK_SIGNING_SECRET: string
}

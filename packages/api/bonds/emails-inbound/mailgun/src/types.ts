/**
 * Type definitions for the Mailgun Routes inbound-emails provider.
 *
 * @module
 */

export type {
  InboundEmail,
  InboundEmailAttachment,
  InboundEmailProvider,
  InboundEmailReply,
  InboundEmailReplyResult,
} from '@molecule/api-emails-inbound'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface — Mailgun Routes shares the same credentials as
     * the outbound `@molecule/api-emails-mailgun` bond. The HMAC signing key
     * used to verify inbound webhooks is the Mailgun API key.
     */
    export interface ProcessEnv {
      /**
       * Mailgun API key. Used as the HMAC-SHA256 signing key when verifying
       * inbound webhook signatures, and as the auth token when dispatching
       * outbound replies.
       */
      MAILGUN_API_KEY?: string

      /**
       * Mailgun sending domain. Used as the default `From:` domain when
       * dispatching outbound replies.
       */
      MAILGUN_DOMAIN?: string

      /**
       * Maximum age in seconds for an inbound webhook timestamp before the
       * provider rejects it as a replay. Defaults to `300` (5 minutes) when
       * unset.
       */
      MAILGUN_INBOUND_REPLAY_WINDOW_SECONDS?: string
    }
  }
}

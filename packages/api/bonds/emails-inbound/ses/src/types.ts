/**
 * Type definitions for the AWS SES inbound-emails provider.
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

/**
 * Allowed hostname suffixes for the SNS `SigningCertURL`. AWS SNS only
 * publishes signing certificates from `*.amazonaws.com`; any URL outside
 * this allowlist MUST be rejected to defend against SSRF and certificate
 * substitution attacks.
 *
 * Exposed for unit-testing; not part of the public bond surface.
 */
export const SNS_SIGNING_CERT_HOSTNAME_SUFFIXES: readonly string[] = ['.amazonaws.com']

/**
 * Shape of an Amazon SNS notification (or SubscriptionConfirmation /
 * UnsubscribeConfirmation) payload, as POSTed to a subscribed HTTPS
 * endpoint. Only the fields used by this bond are typed here.
 *
 * @see https://docs.aws.amazon.com/sns/latest/dg/sns-message-and-json-formats.html
 */
export interface SnsNotificationPayload {
  /**
   * Discriminates the kind of message: `Notification`,
   * `SubscriptionConfirmation`, or `UnsubscribeConfirmation`.
   */
  Type: string

  /** A unique UUID for the message. */
  MessageId: string

  /** The notification topic ARN. */
  TopicArn?: string

  /**
   * Subject line as supplied by the publisher. Optional for notifications.
   */
  Subject?: string

  /** Message payload (string). For SES notifications this is JSON. */
  Message: string

  /** ISO 8601 timestamp when the message was published. */
  Timestamp: string

  /** Signature version. AWS SNS supports `1` (SHA1) and `2` (SHA256). */
  SignatureVersion: string

  /** Base64-encoded signature over the canonical string. */
  Signature: string

  /** URL of the X.509 PEM cert used to sign the message. */
  SigningCertURL: string

  /** Confirmation token (only on SubscriptionConfirmation messages). */
  Token?: string

  /** Subscribe URL (only on SubscriptionConfirmation messages). */
  SubscribeURL?: string

  /** Unsubscribe URL (only on Notification / UnsubscribeConfirmation). */
  UnsubscribeURL?: string
}

/**
 * Shape of the JSON payload SES publishes to SNS for inbound-email
 * notifications. Only the fields used by this bond are typed; SES emits a
 * superset including `verdicts`, `dkim`, etc.
 *
 * @see https://docs.aws.amazon.com/ses/latest/dg/receiving-email-notifications-contents.html
 */
export interface SesInboundNotificationMessage {
  /** Notification kind. We expect `Received` for inbound mail. */
  notificationType: string

  /** Metadata about the SES `mail` object. */
  mail: {
    /** ISO timestamp SES received the message. */
    timestamp: string
    /** Sender as decoded by SES. */
    source: string
    /** SES-assigned message ID. */
    messageId: string
    /** Envelope-recipient list. */
    destination: string[]
    /** Common headers SES extracts from the message. */
    commonHeaders?: {
      from?: string[]
      to?: string[]
      cc?: string[]
      bcc?: string[]
      subject?: string
      messageId?: string
      inReplyTo?: string
      references?: string
    }
    /**
     * All raw headers SES extracted, when `headersTruncated` is `false`.
     */
    headers?: Array<{ name: string; value: string }>
  }

  /**
   * Raw RFC 822 message content, base64-encoded, present when the SES
   * receipt rule includes the message content. Absent for header-only
   * notifications.
   */
  content?: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface — AWS SES Inbound shares credentials with the
     * outbound `@molecule/api-emails-ses` bond. The SNS signing certificate
     * is fetched at verification time; no signing key is held locally.
     */
    export interface ProcessEnv {
      /**
       * Allowlist of hostname suffixes (comma-separated) accepted for the
       * SNS `SigningCertURL`. Defaults to `.amazonaws.com` when unset.
       */
      AWS_SNS_SIGNING_CERT_HOSTNAME_SUFFIXES?: string

      /**
       * Optional explicit SNS topic ARN. When set, notifications whose
       * `TopicArn` does not match are rejected.
       */
      AWS_SES_INBOUND_TOPIC_ARN?: string
    }
  }
}

/**
 * Type definitions for the AgentMail inbound-emails provider.
 *
 * Only the fields this bond reads are typed; AgentMail emits a superset.
 * Every optional field is read defensively — a payload that omits or
 * mistypes one degrades to "absent", never to a crash.
 *
 * @see https://docs.agentmail.to/api-reference/webhooks/events/message-received
 * @see https://docs.agentmail.to/api-reference/inboxes/messages/get
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
 * Attachment METADATA as carried by a webhook payload or a `GET message`
 * response. The bytes are never inline — see
 * {@link AgentMailAttachmentDownload}.
 */
export interface AgentMailAttachmentMeta {
  /** AgentMail's identifier for the attachment. */
  attachment_id: string
  /** Size of the attachment in bytes. */
  size: number
  /** Original filename, when the sender supplied one. */
  filename?: string
  /** MIME type, when known. */
  content_type?: string
  /** `inline` for `cid:`-referenced parts, `attachment` otherwise. */
  content_disposition?: 'inline' | 'attachment'
  /** Content-ID for inline parts referenced from the HTML body. */
  content_id?: string
}

/**
 * Response of `GET /v0/inboxes/{inbox_id}/messages/{message_id}/attachments/{attachment_id}`:
 * the attachment's metadata plus a presigned, time-limited `download_url`
 * from which the raw bytes are fetched.
 *
 * @see https://docs.agentmail.to/api-reference/inboxes/messages/get-attachment
 */
export interface AgentMailAttachmentDownload extends AgentMailAttachmentMeta {
  /** Presigned URL serving the raw attachment bytes (no auth header needed). */
  download_url: string
  /** When `download_url` stops working. */
  expires_at?: string
}

/**
 * An AgentMail message as it appears in a `message.received` webhook payload
 * and in the `GET message` response (same schema).
 *
 * `message_id` is the RFC 5322 `Message-ID`, INCLUDING its angle brackets
 * (`<abc@agentmail.to>`); AgentMail uses that exact string as the path
 * parameter of every per-message endpoint.
 */
export interface AgentMailMessage {
  /** Opaque id of the inbox that received the message (NOT its address). */
  inbox_id: string
  /** Opaque id of the conversation thread. */
  thread_id?: string
  /** RFC 5322 Message-ID, with angle brackets. */
  message_id: string
  /** AgentMail labels, e.g. `['received']`. */
  labels?: string[]
  /** ISO 8601 time AgentMail received the message. */
  timestamp?: string
  /**
   * Sender mailbox (`Alice <alice@example.com>`). The API reference spells
   * this `from`; the webhooks guide's example spells it `from_` — both are
   * documented, so both are read.
   */
  from?: string
  /** Alternate documented spelling of {@link AgentMailMessage.from}. */
  from_?: string
  /** `To:` recipients. */
  to?: string[]
  /** `Cc:` recipients. */
  cc?: string[]
  /** `Bcc:` recipients. */
  bcc?: string[]
  /** `Reply-To:` addresses. */
  reply_to?: string[]
  /** Subject line. */
  subject?: string
  /** Short body preview. */
  preview?: string
  /**
   * Plain-text body. Omitted (together with `html`) when the webhook payload
   * would exceed AgentMail's 1 MB cap — fetch the message via the API then.
   */
  text?: string
  /** HTML body. Omitted under the same 1 MB rule as `text`. */
  html?: string
  /** Attachment metadata only — bytes come from the attachment endpoint. */
  attachments?: AgentMailAttachmentMeta[]
  /** `In-Reply-To` header value, with angle brackets. */
  in_reply_to?: string
  /** `References` header values, with angle brackets. */
  references?: string[]
  /** Raw message headers as a name → value map. */
  headers?: Record<string, string>
  /** Message size in bytes. */
  size?: number
  /** ISO 8601 creation time. */
  created_at?: string
  /** ISO 8601 last-update time. */
  updated_at?: string
}

/**
 * Top-level shape of an AgentMail webhook delivery for the
 * `message.received*` event family.
 *
 * @see https://docs.agentmail.to/api-reference/webhooks/events/message-received
 */
export interface AgentMailWebhookEvent {
  /** Always `event`. */
  type?: string
  /**
   * `message.received`, `message.received.spam`,
   * `message.received.blocked`, or `message.received.unauthenticated`.
   */
  event_type: string
  /** Unique id of this event. */
  event_id?: string
  /** The received message. */
  message: AgentMailMessage
}

/**
 * Request body of `POST /v0/inboxes/{inbox_id}/messages/{message_id}/reply`.
 * Every field is optional on the wire; AgentMail threads the reply itself
 * (there is no `subject` — the original's is reused).
 *
 * @see https://docs.agentmail.to/api-reference/inboxes/messages/reply
 */
export interface AgentMailReplyRequest {
  /** Recipient(s). */
  to?: string | string[]
  /** CC recipient(s). */
  cc?: string | string[]
  /** BCC recipient(s). */
  bcc?: string | string[]
  /** Reply-To address(es). */
  reply_to?: string | string[]
  /** Plain-text body. */
  text?: string
  /** HTML body. */
  html?: string
  /** Attachments; `content` is the base64-encoded payload. */
  attachments?: AgentMailReplyAttachment[]
  /** Custom message headers. */
  headers?: Record<string, string>
  /** Message labels. */
  labels?: string[]
}

/** One attachment in an {@link AgentMailReplyRequest}. */
export interface AgentMailReplyAttachment {
  /** Filename shown to the recipient. */
  filename?: string
  /** MIME type. */
  content_type?: string
  /** `inline` for `cid:`-referenced parts. */
  content_disposition?: 'inline' | 'attachment'
  /** Content-ID for inline parts. */
  content_id?: string
  /** Base64-encoded attachment bytes. */
  content?: string
}

/** Response of the reply endpoint. */
export interface AgentMailReplyResponse {
  /** Message-ID of the created reply. */
  message_id: string
  /** Thread the reply belongs to. */
  thread_id?: string
}

/**
 * AgentMail's error envelope.
 *
 * @see https://docs.agentmail.to/errors
 */
export interface AgentMailErrorBody {
  /** Legacy error type name (e.g. `NotFoundError`). */
  name?: string
  /** Machine-readable error code (e.g. `unknown_api_key`, `rate_limit_exceeded`). */
  code?: string
  /** Human-readable description. */
  message?: string
  /** Concrete remediation steps, when AgentMail supplied them. */
  fix?: string
  /** Link to the error's documentation. */
  docs?: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface — AgentMail credentials for the inbound bond.
     * Webhooks are verified with the per-webhook signing secret; the API key
     * is used for message/attachment hydration and for reply dispatch.
     */
    export interface ProcessEnv {
      /**
       * AgentMail API key (`am_…`). Sent as `Authorization: Bearer` on every
       * API call: body hydration, attachment download, reply dispatch.
       */
      AGENTMAIL_API_KEY?: string

      /**
       * Webhook signing secret (`whsec_…`) returned when the webhook was
       * created. Used to verify the `svix-signature` of inbound webhooks.
       */
      AGENTMAIL_WEBHOOK_SECRET?: string

      /**
       * Optional `inbox_id` this app owns. When set, webhooks for any other
       * inbox are rejected by `parseWebhookPayload`, and replies are sent
       * from this inbox even when the original parse happened in another
       * process.
       */
      AGENTMAIL_INBOX_ID?: string

      /**
       * Optional API base URL. Defaults to `https://api.agentmail.to`; set
       * `https://api.agentmail.eu` for the EU region.
       */
      AGENTMAIL_BASE_URL?: string

      /**
       * Maximum age in seconds for an inbound webhook timestamp before the
       * provider rejects it as a replay. Defaults to `300` (5 minutes) when
       * unset.
       */
      AGENTMAIL_INBOUND_REPLAY_WINDOW_SECONDS?: string
    }
  }
}

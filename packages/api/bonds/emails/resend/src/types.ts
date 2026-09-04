/**
 * Type definitions for the Resend email provider.
 *
 * @module
 */

export type { EmailMessage, EmailSendResult, EmailTransport } from '@molecule/api-emails'

/**
 * One entry of a send request's `attachments[]`, exactly as the Resend REST API
 * expects it: base64 `content` plus snake_case metadata.
 */
export interface ResendAttachment {
  /** File content, base64-encoded. */
  content: string
  /** File name shown to the recipient; Resend derives the MIME type from it when `content_type` is unset. */
  filename: string
  /** MIME type of the file. */
  content_type?: string
  /** Content-ID for an inline image referenced as `cid:` in the HTML body. */
  content_id?: string
}

/**
 * Request body for `POST /emails`. Field names are the REST API's own
 * (snake_case, e.g. `reply_to`) — NOT the camelCase the official SDK accepts.
 */
export interface ResendSendRequest {
  /** Sender, as a bare address or `Name <address>`. */
  from: string
  /** Recipients (Resend accepts at most 50). */
  to: string[]
  /** Subject line. */
  subject: string
  /** CC recipients. */
  cc?: string[]
  /** BCC recipients. */
  bcc?: string[]
  /** Reply-To address. */
  reply_to?: string
  /** HTML body. */
  html?: string
  /** Plain-text body (Resend derives one from `html` when omitted). */
  text?: string
  /** File attachments. */
  attachments?: ResendAttachment[]
}

/**
 * What {@link ResendClient.send} resolves with: the HTTP status of the accepted
 * request and the message `id` Resend returned in the response body.
 */
export interface ResendSendResponse {
  /** HTTP status code of the response (2xx). */
  status: number
  /** The `id` from the response body, when present. */
  id?: string
}

/**
 * Resend's JSON error body (`{ statusCode, message, name }`), with every field
 * optional because the wire is not trusted.
 */
export interface ResendErrorBody {
  /** HTTP status Resend reports in the body (may be `null`). */
  statusCode?: number | null
  /** Human-readable error message. */
  message?: string
  /** Machine-readable error name, e.g. `validation_error`, `daily_quota_exceeded`. */
  name?: string
}

/**
 * The narrow HTTP client this bond uses to reach Resend.
 */
export interface ResendClient {
  /**
   * Sends one email via `POST /emails`.
   * @returns The HTTP status and the message id.
   */
  send(request: ResendSendRequest): Promise<ResendSendResponse>
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * The key used for Resend's API.
       */
      RESEND_API_KEY?: string

      /**
       * Optional default sender (`Name <address>` or a bare address on a
       * domain verified in Resend), used when a message's `from` is empty.
       */
      RESEND_FROM?: string

      /**
       * Optional base URL override for the Resend API (e.g. a credential
       * broker or a Resend-compatible endpoint). When unset, the API's
       * default `https://api.resend.com` is used.
       */
      RESEND_BASE_URL?: string
    }
  }
}

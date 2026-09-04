/**
 * Minimal AgentMail REST client — only the three calls the inbound bond
 * needs: fetch a message (to hydrate bodies the 1 MB webhook cap omitted),
 * download an attachment (metadata → presigned URL → bytes), and reply.
 * Built on the global `fetch`; no SDK.
 *
 * @see https://docs.agentmail.to/api-reference
 * @see https://docs.agentmail.to/errors
 * @see https://docs.agentmail.to/knowledge-base/rate-limits
 *
 * @module
 */

import { Buffer } from 'node:buffer'

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when api.js is imported directly
// (not through the package barrel).
import './secrets.js'

import { configNotConfiguredError } from '@molecule/api-secrets'

import type {
  AgentMailAttachmentDownload,
  AgentMailErrorBody,
  AgentMailMessage,
  AgentMailReplyRequest,
  AgentMailReplyResponse,
} from './types.js'
import { DEFAULT_BASE_URL, isRecord, parseRetryAfterSeconds } from './utilities.js'

/**
 * Timeout (ms) for a JSON API call. Bounds a hanging AgentMail endpoint so
 * the webhook handler fails (and AgentMail retries) instead of stalling.
 */
export const API_REQUEST_TIMEOUT_MS = 15_000

/**
 * Timeout (ms) for downloading one attachment's bytes from its presigned
 * URL. Larger than {@link API_REQUEST_TIMEOUT_MS} because it moves the
 * attachment payload, not a small JSON document.
 */
export const ATTACHMENT_DOWNLOAD_TIMEOUT_MS = 60_000

/**
 * A non-2xx response from the AgentMail API, carrying the documented error
 * envelope's `code` / `name` / `fix` and — for `429` — the `Retry-After`
 * delay. The message never includes the API key.
 */
export class AgentMailApiError extends Error {
  /** HTTP status AgentMail returned. */
  readonly statusCode: number
  /** Machine-readable error code (`unknown_api_key`, `rate_limit_exceeded`, …). */
  readonly code: string | undefined
  /** Legacy error type name from the envelope (`NotFoundError`, …). */
  readonly errorName: string | undefined
  /** Remediation steps from the envelope, when AgentMail supplied any. */
  readonly fix: string | undefined
  /** Seconds to wait before retrying, from `Retry-After` (rate limits). */
  readonly retryAfterSeconds: number | undefined

  /**
   * Builds the error from the HTTP status and the parsed envelope.
   *
   * @param message - Human-readable description.
   * @param details - Status and envelope fields.
   */
  constructor(
    message: string,
    details: {
      statusCode: number
      code?: string
      errorName?: string
      fix?: string
      retryAfterSeconds?: number
    },
  ) {
    super(message)
    this.name = 'AgentMailApiError'
    this.statusCode = details.statusCode
    this.code = details.code
    this.errorName = details.errorName
    this.fix = details.fix
    this.retryAfterSeconds = details.retryAfterSeconds
  }
}

/**
 * Reads the AgentMail API key from the environment, throwing the tagged
 * `config.notConfigured` error (never revealing any value) when unset.
 *
 * @returns The API key.
 */
export const getApiKey = (): string => {
  const apiKey = process.env.AGENTMAIL_API_KEY
  if (!apiKey) {
    // Tagged config-missing error → clean 503 + 'config.notConfigured', with the
    // registered definition's description + setup URL (see classifyTaggedError).
    throw configNotConfiguredError('AGENTMAIL_API_KEY', 'inbound email')
  }
  return apiKey
}

/**
 * Resolves the API base URL: `AGENTMAIL_BASE_URL` when set (trailing
 * slashes stripped), else {@link DEFAULT_BASE_URL}.
 *
 * @returns The base URL without a trailing slash.
 */
export const getBaseUrl = (): string => {
  const raw = process.env.AGENTMAIL_BASE_URL?.trim()
  const base = raw && raw.length > 0 ? raw : DEFAULT_BASE_URL
  return base.replace(/\/+$/u, '')
}

/**
 * Path of a message resource. Both ids are URL-encoded — AgentMail's
 * `message_id` is the RFC 5322 Message-ID INCLUDING angle brackets and `@`.
 *
 * @param inboxId - The inbox id.
 * @param messageId - The message id, exactly as AgentMail supplied it.
 * @returns `/v0/inboxes/{inbox_id}/messages/{message_id}`.
 */
export const messagePath = (inboxId: string, messageId: string): string => {
  return `/v0/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}`
}

/**
 * Converts a non-2xx response into an {@link AgentMailApiError}, reading
 * the documented error envelope when the body carries one and falling back
 * to a snippet of the raw body (e.g. the plain-text `413`).
 *
 * @param response - The failed response.
 * @param method - HTTP method, for the message.
 * @param path - Request path, for the message.
 * @returns The mapped error.
 */
const toApiError = async (
  response: Response,
  method: string,
  path: string,
): Promise<AgentMailApiError> => {
  let text = ''
  try {
    text = await response.text()
  } catch (_error) {
    // An unreadable error body is still an error response — report the
    // status without a detail rather than masking the failure.
  }

  let envelope: AgentMailErrorBody = {}
  try {
    const parsed: unknown = JSON.parse(text)
    if (isRecord(parsed)) envelope = parsed
  } catch (_error) {
    // Not JSON (AgentMail's 413 is a bare message) — fall through to the
    // raw-text snippet below.
  }

  const code = typeof envelope.code === 'string' ? envelope.code : undefined
  const errorName = typeof envelope.name === 'string' ? envelope.name : undefined
  const fix = typeof envelope.fix === 'string' ? envelope.fix : undefined
  const detail =
    typeof envelope.message === 'string' && envelope.message.length > 0
      ? envelope.message
      : text.trim().slice(0, 200) || response.statusText || 'no response body'

  const message =
    `AgentMail ${method} ${path} failed with HTTP ${String(response.status)}` +
    `${code ? ` (${code})` : ''}: ${detail}${fix ? ` ${fix}` : ''}`

  return new AgentMailApiError(message, {
    statusCode: response.status,
    code,
    errorName,
    fix,
    retryAfterSeconds: parseRetryAfterSeconds(response.headers.get('retry-after')),
  })
}

/**
 * Performs one authenticated JSON call against the AgentMail API.
 *
 * @param method - HTTP method.
 * @param path - Path under the base URL (must start with `/`).
 * @param body - Optional JSON request body.
 * @returns The parsed JSON response.
 * @throws {AgentMailApiError} On any non-2xx response.
 * @throws {Error} The tagged `config.notConfigured` error when
 *   `AGENTMAIL_API_KEY` is unset.
 */
export const agentMailRequest = async <T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<T> => {
  const apiKey = getApiKey()
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
  }
  const init: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(API_REQUEST_TIMEOUT_MS),
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }

  const response = await fetch(`${getBaseUrl()}${path}`, init)
  if (!response.ok) throw await toApiError(response, method, path)
  return (await response.json()) as T
}

/**
 * Fetches a full message — used to hydrate `text` / `html` when the webhook
 * payload omitted them (AgentMail drops both once the payload would exceed
 * 1 MB).
 *
 * @param inboxId - The inbox id.
 * @param messageId - The message id, exactly as AgentMail supplied it.
 * @returns The message.
 * @see https://docs.agentmail.to/api-reference/inboxes/messages/get
 */
export const getMessage = async (inboxId: string, messageId: string): Promise<AgentMailMessage> => {
  return agentMailRequest<AgentMailMessage>('GET', messagePath(inboxId, messageId))
}

/**
 * Fetches an attachment's metadata + presigned `download_url`.
 *
 * @param inboxId - The inbox id.
 * @param messageId - The message id, exactly as AgentMail supplied it.
 * @param attachmentId - The attachment id from the message's metadata.
 * @returns The attachment metadata and download URL.
 * @see https://docs.agentmail.to/api-reference/inboxes/messages/get-attachment
 */
export const getAttachmentDownload = async (
  inboxId: string,
  messageId: string,
  attachmentId: string,
): Promise<AgentMailAttachmentDownload> => {
  return agentMailRequest<AgentMailAttachmentDownload>(
    'GET',
    `${messagePath(inboxId, messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
  )
}

/**
 * Downloads an attachment's bytes: resolves the presigned `download_url`
 * via {@link getAttachmentDownload}, then GETs it. The presigned request
 * deliberately carries NO `Authorization` header — the URL is self-
 * authenticating, and object stores reject a request that presents two
 * auth mechanisms at once.
 *
 * @param inboxId - The inbox id.
 * @param messageId - The message id, exactly as AgentMail supplied it.
 * @param attachmentId - The attachment id from the message's metadata.
 * @returns The metadata and the raw bytes.
 * @throws {AgentMailApiError} When either request fails.
 */
export const downloadAttachment = async (
  inboxId: string,
  messageId: string,
  attachmentId: string,
): Promise<{ meta: AgentMailAttachmentDownload; content: Buffer }> => {
  const meta = await getAttachmentDownload(inboxId, messageId, attachmentId)
  if (typeof meta.download_url !== 'string' || meta.download_url.length === 0) {
    throw new Error(
      `AgentMail returned no download_url for attachment ${attachmentId} of message ${messageId}.`,
    )
  }

  const response = await fetch(meta.download_url, {
    method: 'GET',
    signal: AbortSignal.timeout(ATTACHMENT_DOWNLOAD_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new AgentMailApiError(
      `AgentMail attachment download for ${attachmentId} failed with HTTP ${String(response.status)}.`,
      {
        statusCode: response.status,
        retryAfterSeconds: parseRetryAfterSeconds(response.headers.get('retry-after')),
      },
    )
  }
  return { meta, content: Buffer.from(await response.arrayBuffer()) }
}

/**
 * Sends a reply to a message from the inbox that received it. AgentMail
 * threads the reply (`In-Reply-To` / `References` / subject) itself.
 *
 * @param inboxId - The inbox id.
 * @param messageId - The message id, exactly as AgentMail supplied it.
 * @param body - The reply.
 * @returns The created message's ids.
 * @see https://docs.agentmail.to/api-reference/inboxes/messages/reply
 */
export const replyToMessage = async (
  inboxId: string,
  messageId: string,
  body: AgentMailReplyRequest,
): Promise<AgentMailReplyResponse> => {
  return agentMailRequest<AgentMailReplyResponse>(
    'POST',
    `${messagePath(inboxId, messageId)}/reply`,
    body,
  )
}

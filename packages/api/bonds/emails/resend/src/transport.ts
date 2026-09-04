/**
 * Resend HTTP client — a thin `fetch` wrapper around `POST /emails`.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when transport.js is imported directly
// (not through the package barrel).
import './secrets.js'

import { configNotConfiguredError } from '@molecule/api-secrets'

import type {
  ResendClient,
  ResendErrorBody,
  ResendSendRequest,
  ResendSendResponse,
} from './types.js'

/** Resend's REST API base URL. Override with `RESEND_BASE_URL`. */
export const RESEND_DEFAULT_BASE_URL = 'https://api.resend.com'

/**
 * A non-2xx response from the Resend API.
 *
 * `status` is the HTTP status, `code` is Resend's machine-readable error `name`
 * (e.g. `validation_error`, `rate_limit_exceeded`, `daily_quota_exceeded`) when
 * the body carried one, and `body` is the parsed error body. Deliberately NOT
 * tagged with `statusCode` / `errorKey`: Resend's status describes OUR request
 * to Resend (a 401 is a bad key, a 403 an unverified domain), not the caller's
 * request to the app, so the API middleware must fall through to its generic
 * 500 rather than echo it.
 */
export class ResendApiError extends Error {
  /** HTTP status of the Resend response. */
  readonly status: number
  /** Resend's error name from the body, when present. */
  readonly code: string | undefined
  /** The parsed error body, when the response was JSON. */
  readonly body: ResendErrorBody | undefined

  /**
   * Builds the error from a non-2xx Resend response.
   * @param status - HTTP status of the response.
   * @param body - The parsed error body, if the response was JSON.
   * @param rawBody - The raw response text (used in the message when the body was not JSON).
   */
  constructor(status: number, body: ResendErrorBody | undefined, rawBody: string) {
    const detail = body?.message ?? (rawBody.trim() || 'no response body')
    super(`Resend API error ${status}${body?.name ? ` (${body.name})` : ''}: ${detail}`)
    this.name = 'ResendApiError'
    this.status = status
    this.code = body?.name
    this.body = body
  }
}

/**
 * Whether a value is a non-null object (a JSON object on the wire).
 * @param value - The parsed value.
 * @returns `true` for a plain object.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/**
 * Parses a response body as JSON, tolerating an empty or non-JSON body.
 * @param text - The raw response text.
 * @returns The parsed value, or `undefined` when the body is empty or not JSON.
 */
const parseJson = (text: string): unknown => {
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch (_error) {
    // Intentional: a non-JSON body (an HTML gateway page, plain text) is
    // reported by the caller via the raw text, so there is nothing to log here.
    return undefined
  }
}

/**
 * Narrows a parsed error response to Resend's `{ statusCode, message, name }` shape.
 * @param parsed - The parsed response body.
 * @returns The error body, or `undefined` when the body was not a JSON object.
 */
const toErrorBody = (parsed: unknown): ResendErrorBody | undefined => {
  if (!isRecord(parsed)) return undefined
  return {
    statusCode: typeof parsed.statusCode === 'number' ? parsed.statusCode : null,
    message: typeof parsed.message === 'string' ? parsed.message : undefined,
    name: typeof parsed.name === 'string' ? parsed.name : undefined,
  }
}

/**
 * Resolves the API base URL from the environment on each call (late secrets
 * resolution is honored), trimming any trailing slash.
 * @returns The base URL without a trailing slash.
 */
const resolveBaseUrl = (): string =>
  (process.env.RESEND_BASE_URL || RESEND_DEFAULT_BASE_URL).replace(/\/+$/, '')

/**
 * The shared client. Environment is read INSIDE `send()` — never at import
 * time — so a `RESEND_API_KEY` / `RESEND_BASE_URL` resolved into `process.env`
 * after this module is imported (a secrets bond resolving at startup) is the
 * value used on the next send.
 */
const client: ResendClient = {
  async send(request: ResendSendRequest): Promise<ResendSendResponse> {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      // Tagged config-missing error → clean 503 + 'config.notConfigured'
      // instead of an opaque Resend 401 from an unauthenticated request.
      throw configNotConfiguredError('RESEND_API_KEY', 'email sending')
    }

    const response = await fetch(`${resolveBaseUrl()}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    const text = await response.text()
    const parsed = parseJson(text)

    if (!response.ok) {
      throw new ResendApiError(response.status, toErrorBody(parsed), text)
    }

    return {
      status: response.status,
      id: isRecord(parsed) && typeof parsed.id === 'string' ? parsed.id : undefined,
    }
  },
}

/**
 * Returns the Resend HTTP client. Nothing is configured up front: the API key
 * and base URL are read from the environment on every `send()`.
 *
 * @returns The Resend client.
 */
export const getClient = (): ResendClient => client

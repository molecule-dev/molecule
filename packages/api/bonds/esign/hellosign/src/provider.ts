/**
 * HelloSign (Dropbox Sign) e-signature provider.
 *
 * Implements `@molecule/api-esign`'s `EsignProvider` interface against the
 * HelloSign v3 REST API at `https://api.hellosign.com/v3/`. Uses HTTP Basic
 * auth (`HELLOSIGN_API_KEY:` as the userinfo, empty password) and a
 * multipart upload for raw-Buffer documents. Webhook callbacks are verified
 * via HMAC-SHA256 using the same API key as the secret.
 *
 * @see https://developers.hellosign.com/api/reference/
 *
 * @module
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

import { getLogger } from '@molecule/api-bond'
import type {
  CreateSignatureRequestInput,
  EsignDocument,
  EsignProvider,
  EsignWebhookEvent,
  EsignWebhookEventType,
  SignatureRequest,
  SignatureRequestStatus,
  SignerStatus,
  SignerWithStatus,
} from '@molecule/api-esign'

const logger = getLogger()

const API_BASE = 'https://api.hellosign.com/v3'

/**
 * Generic JSON payload returned by HelloSign endpoints under the
 * `signature_request` key.
 */
interface HelloSignSignatureRequestRaw {
  signature_request_id: string
  is_complete?: boolean
  is_declined?: boolean
  has_error?: boolean
  signatures?: Array<{
    signer_email_address?: string
    signer_name?: string
    signer_role?: string
    status_code?: string
    signed_at?: number | null
  }>
}

/**
 * Sanitizes an Error so the API key is never echoed back to the caller.
 *
 * @param err - The original error.
 * @param fallback - Default message when the original is suspect.
 * @returns A new Error safe to propagate.
 */
const sanitizeError = (err: unknown, fallback: string): Error => {
  const apiKey = process.env.HELLOSIGN_API_KEY
  let message = err instanceof Error ? err.message : String(err)
  if (apiKey && apiKey.length > 0 && message.includes(apiKey)) {
    message = fallback
  }
  return new Error(message || fallback)
}

/**
 * Reads the HelloSign API key from the environment, throwing a generic
 * error if it is missing. The error message NEVER contains the key value.
 *
 * @returns The API key string.
 * @throws {Error} If `HELLOSIGN_API_KEY` is not configured.
 */
const requireApiKey = (): string => {
  const key = process.env.HELLOSIGN_API_KEY
  if (!key) {
    throw new Error('HELLOSIGN_API_KEY is not set. E-signature requests will not work.')
  }
  return key
}

/**
 * Builds the HTTP Basic auth header value for HelloSign.
 *
 * @returns The full `Authorization` header value.
 */
const authHeader = (): string => {
  const key = requireApiKey()
  // HelloSign uses the API key as username with empty password.
  return `Basic ${Buffer.from(`${key}:`).toString('base64')}`
}

/**
 * Maps a HelloSign per-signer `status_code` to the normalized `SignerStatus`.
 *
 * @param code - The HelloSign signer status code.
 * @returns The normalized signer status.
 */
const mapSignerStatus = (code: string | undefined): SignerStatus => {
  switch (code) {
    case 'signed':
      return 'signed'
    case 'declined':
    case 'on_hold':
      return 'declined'
    case 'awaiting_signature':
      return 'pending'
    case 'expired':
      return 'expired'
    default:
      return 'pending'
  }
}

/**
 * Maps a HelloSign signature_request flags object to the aggregate status.
 *
 * @param raw - The raw HelloSign signature request payload.
 * @returns The aggregate signature request status.
 */
const mapAggregateStatus = (raw: HelloSignSignatureRequestRaw): SignatureRequestStatus => {
  if (raw.is_declined) return 'declined'
  if (raw.is_complete) return 'signed'
  if (raw.has_error) return 'cancelled'
  return 'awaiting_signatures'
}

/**
 * Normalizes a raw HelloSign signature request payload into the core
 * `SignatureRequest` shape.
 *
 * @param raw - Raw HelloSign signature_request object.
 * @returns Normalized signature request.
 */
const normalizeSignatureRequest = (raw: HelloSignSignatureRequestRaw): SignatureRequest => {
  const signers: SignerWithStatus[] = (raw.signatures || []).map((s) => {
    const status = mapSignerStatus(s.status_code)
    const result: SignerWithStatus = {
      name: s.signer_name || '',
      email: s.signer_email_address || '',
      status,
    }
    if (s.signer_role) result.role = s.signer_role
    if (typeof s.signed_at === 'number') {
      result.signedAt = new Date(s.signed_at * 1000).toISOString()
    }
    return result
  })

  const status = mapAggregateStatus(raw)
  const completedAt = signers
    .map((s) => s.signedAt)
    .filter((v): v is string => typeof v === 'string')
    .sort()
    .pop()

  const result: SignatureRequest = {
    id: raw.signature_request_id,
    status,
    signers,
  }
  if (status === 'signed' && completedAt) result.signedAt = completedAt
  return result
}

/**
 * Internal helper: build a multipart `FormData` body for the
 * `signature_request/send` endpoint when uploading a raw Buffer document.
 *
 * Uses the global `FormData` / `Blob` from Node's undici-backed fetch
 * runtime so the boundary is generated automatically.
 *
 * @param input - Validated input.
 * @param document - The raw document bytes.
 * @param filename - Filename presented to HelloSign.
 * @returns The populated `FormData` instance.
 */
const buildSendFormData = (
  input: CreateSignatureRequestInput,
  document: Buffer,
  filename: string,
): FormData => {
  const form = new FormData()
  form.append('title', input.title)
  form.append('subject', input.title)
  if (input.message) form.append('message', input.message)

  input.signers.forEach((signer, idx) => {
    form.append(`signers[${idx}][name]`, signer.name)
    form.append(`signers[${idx}][email_address]`, signer.email)
    if (signer.role) form.append(`signers[${idx}][role]`, signer.role)
  })
  ;(input.ccs || []).forEach((cc, idx) => {
    form.append(`cc_email_addresses[${idx}]`, cc)
  })

  // Copy into a fresh ArrayBuffer-backed Uint8Array so the typing
  // satisfies the DOM-lib `BlobPart` (ArrayBuffer, not SharedArrayBuffer).
  const view = new Uint8Array(document.byteLength)
  view.set(document)
  const blob = new Blob([view], { type: 'application/octet-stream' })
  form.append('file[0]', blob, filename)
  return form
}

/**
 * Internal helper: build a JSON body for `signature_request/send` when the
 * caller supplies a hosted document URL.
 *
 * @param input - The signature request input.
 * @param url - The hosted document URL.
 * @returns The JSON body payload.
 */
const buildSendUrlJson = (
  input: CreateSignatureRequestInput,
  url: string,
): Record<string, unknown> => {
  return {
    title: input.title,
    subject: input.title,
    message: input.message,
    signers: input.signers.map((s) => {
      const out: Record<string, string> = { name: s.name, email_address: s.email }
      if (s.role) out.role = s.role
      return out
    }),
    cc_email_addresses: input.ccs,
    file_url: [url],
  }
}

/**
 * Internal helper: build a JSON body for
 * `signature_request/send_with_template` when the caller supplies a
 * template id with prefill data.
 *
 * @param input - The signature request input.
 * @param templateId - The HelloSign template id.
 * @param prefill - Optional custom-field prefill map.
 * @returns The JSON body payload.
 */
const buildSendTemplateJson = (
  input: CreateSignatureRequestInput,
  templateId: string,
  prefill: Record<string, string | number | boolean> | undefined,
): Record<string, unknown> => {
  return {
    template_ids: [templateId],
    title: input.title,
    subject: input.title,
    message: input.message,
    signers: input.signers.map((s, idx) => {
      const out: Record<string, string> = {
        name: s.name,
        email_address: s.email,
        role: s.role || `Signer ${idx + 1}`,
      }
      return out
    }),
    cc_email_addresses: input.ccs,
    custom_fields: prefill
      ? Object.entries(prefill).map(([name, value]) => ({ name, value }))
      : undefined,
  }
}

/**
 * Performs a JSON-bodied HelloSign POST and returns the parsed response.
 *
 * @param path - API path relative to {@link API_BASE}.
 * @param body - JSON body to send.
 * @returns The parsed response body as `unknown`.
 * @throws {Error} On a non-2xx response. The API key is never leaked.
 */
const postJson = async (path: string, body: Record<string, unknown>): Promise<unknown> => {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HelloSign ${path} failed: ${res.status} ${text}`)
  }
  return res.json()
}

/**
 * Performs a multipart-bodied HelloSign POST and returns the parsed response.
 * The runtime sets `Content-Type` (with the boundary) automatically when
 * `body` is a `FormData` instance.
 *
 * @param path - API path relative to {@link API_BASE}.
 * @param form - The multipart form-data body.
 * @returns The parsed response body as `unknown`.
 * @throws {Error} On a non-2xx response. The API key is never leaked.
 */
const postMultipart = async (path: string, form: FormData): Promise<unknown> => {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: authHeader() },
    body: form,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HelloSign ${path} failed: ${res.status} ${text}`)
  }
  return res.json()
}

/**
 * Discriminates the three forms of `EsignDocument`.
 *
 * @param doc - The document descriptor.
 * @returns A tagged union for downstream switches.
 */
const classifyDocument = (
  doc: EsignDocument,
):
  | { kind: 'buffer'; content: Buffer }
  | { kind: 'url'; url: string; filename: string }
  | {
      kind: 'template'
      templateId: string
      prefill?: Record<string, string | number | boolean>
    } => {
  if (Buffer.isBuffer(doc)) return { kind: 'buffer', content: doc }
  if ('templateId' in doc) {
    return { kind: 'template', templateId: doc.templateId, prefill: doc.prefill }
  }
  return { kind: 'url', url: doc.url, filename: doc.filename || 'document.pdf' }
}

/**
 * Maps a HelloSign webhook `event_type` to the normalized
 * {@link EsignWebhookEventType}.
 *
 * @param eventType - The raw HelloSign event_type string.
 * @returns The normalized event type.
 */
const mapEventType = (eventType: string | undefined): EsignWebhookEventType => {
  switch (eventType) {
    case 'signature_request_signed':
      return 'signature_request_signed'
    case 'signature_request_all_signed':
      return 'signature_request_all_signed'
    case 'signature_request_declined':
      return 'signature_request_declined'
    case 'signature_request_canceled':
    case 'signature_request_cancelled':
      return 'signature_request_cancelled'
    case 'signature_request_expired':
      return 'signature_request_expired'
    default:
      return 'unknown'
  }
}

/**
 * Verifies a HelloSign webhook event_hash via HMAC-SHA256.
 *
 * Per the HelloSign docs, `event_hash = hmac_sha256(api_key, event_time + event_type)`.
 *
 * @param apiKey - The HelloSign API key (used as HMAC secret).
 * @param eventTime - The `event_time` field from the event.
 * @param eventType - The `event_type` field from the event.
 * @param providedHash - The `event_hash` claimed by the webhook.
 * @returns `true` if the hash matches.
 */
const verifyEventHash = (
  apiKey: string,
  eventTime: string,
  eventType: string,
  providedHash: string,
): boolean => {
  const expected = createHmac('sha256', apiKey)
    .update(eventTime + eventType)
    .digest('hex')
  if (expected.length !== providedHash.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(providedHash, 'hex'))
  } catch (_error) {
    // timingSafeEqual throws if buffers differ in byte length (e.g. malformed
    // hex input); treat any such failure as a non-matching hash — safe noop.
    return false
  }
}

/**
 * Creates a new signature request via HelloSign. Routes between three
 * endpoints depending on the document form:
 *
 * - Buffer → `signature_request/send` (multipart)
 * - URL    → `signature_request/send` (JSON `file_url`)
 * - Template → `signature_request/send_with_template`
 *
 * @param input - The signature request input.
 * @returns The newly-created normalized signature request.
 */
export const createSignatureRequest = async (
  input: CreateSignatureRequestInput,
): Promise<SignatureRequest> => {
  try {
    const doc = classifyDocument(input.document)
    let raw: { signature_request: HelloSignSignatureRequestRaw }
    switch (doc.kind) {
      case 'buffer': {
        const form = buildSendFormData(input, doc.content, 'document.pdf')
        raw = (await postMultipart('/signature_request/send', form)) as {
          signature_request: HelloSignSignatureRequestRaw
        }
        break
      }
      case 'url': {
        raw = (await postJson('/signature_request/send', buildSendUrlJson(input, doc.url))) as {
          signature_request: HelloSignSignatureRequestRaw
        }
        break
      }
      case 'template': {
        raw = (await postJson(
          '/signature_request/send_with_template',
          buildSendTemplateJson(input, doc.templateId, doc.prefill),
        )) as { signature_request: HelloSignSignatureRequestRaw }
        break
      }
    }
    return normalizeSignatureRequest(raw.signature_request)
  } catch (err) {
    logger.error('HelloSign createSignatureRequest error:', err)
    throw sanitizeError(err, 'HelloSign createSignatureRequest failed.')
  }
}

/**
 * Retrieves the current state of a HelloSign signature request.
 *
 * @param id - HelloSign signature_request_id.
 * @returns The normalized signature request.
 */
export const getSignatureRequest = async (id: string): Promise<SignatureRequest> => {
  try {
    const res = await fetch(`${API_BASE}/signature_request/${encodeURIComponent(id)}`, {
      headers: { Authorization: authHeader() },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`HelloSign get signature_request failed: ${res.status} ${text}`)
    }
    const json = (await res.json()) as { signature_request: HelloSignSignatureRequestRaw }
    return normalizeSignatureRequest(json.signature_request)
  } catch (err) {
    logger.error('HelloSign getSignatureRequest error:', err)
    throw sanitizeError(err, 'HelloSign getSignatureRequest failed.')
  }
}

/**
 * Cancels a pending HelloSign signature request.
 *
 * @param id - HelloSign signature_request_id.
 */
export const cancelSignatureRequest = async (id: string): Promise<void> => {
  try {
    const res = await fetch(`${API_BASE}/signature_request/cancel/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { Authorization: authHeader() },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`HelloSign cancel failed: ${res.status} ${text}`)
    }
  } catch (err) {
    logger.error('HelloSign cancelSignatureRequest error:', err)
    throw sanitizeError(err, 'HelloSign cancelSignatureRequest failed.')
  }
}

/**
 * Downloads the signed PDF for a HelloSign signature request.
 *
 * @param id - HelloSign signature_request_id.
 * @returns The signed document bytes.
 */
export const getSignedDocument = async (id: string): Promise<Buffer> => {
  try {
    const res = await fetch(
      `${API_BASE}/signature_request/files/${encodeURIComponent(id)}?file_type=pdf`,
      { headers: { Authorization: authHeader() } },
    )
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`HelloSign download failed: ${res.status} ${text}`)
    }
    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (err) {
    logger.error('HelloSign getSignedDocument error:', err)
    throw sanitizeError(err, 'HelloSign getSignedDocument failed.')
  }
}

/**
 * Verifies and parses an inbound HelloSign webhook callback. The HelloSign
 * webhook payload arrives form-encoded with a single `json` field whose
 * value is the JSON body. The body contains `event.event_hash`, computed
 * as `hmac_sha256(api_key, event_time + event_type)`.
 *
 * Implementations that pre-parse the form into `{ json: '...' }` should
 * pass the resulting object directly. The provider also tolerates a body
 * already shaped like the inner event payload.
 *
 * @param _headers - The HTTP request headers (unused; HelloSign places
 *   the hash inside the body).
 * @param body - The parsed request body.
 * @returns The normalized webhook event.
 * @throws {Error} If the event_hash is missing or invalid.
 */
export const processWebhook = async (
  _headers: Record<string, string | string[] | undefined>,
  body: unknown,
): Promise<EsignWebhookEvent> => {
  try {
    const apiKey = requireApiKey()

    let payload: Record<string, unknown>
    if (
      body &&
      typeof body === 'object' &&
      'json' in (body as Record<string, unknown>) &&
      typeof (body as Record<string, unknown>).json === 'string'
    ) {
      payload = JSON.parse((body as Record<string, string>).json) as Record<string, unknown>
    } else if (body && typeof body === 'object') {
      payload = body as Record<string, unknown>
    } else {
      throw new Error('HelloSign webhook body is not an object.')
    }

    const event = (payload.event || {}) as Record<string, unknown>
    const eventTime = String(event.event_time || '')
    const eventType = String(event.event_type || '')
    const eventHash = String(event.event_hash || '')

    if (!eventTime || !eventType || !eventHash) {
      throw new Error('HelloSign webhook missing event_time/event_type/event_hash.')
    }

    if (!verifyEventHash(apiKey, eventTime, eventType, eventHash)) {
      throw new Error('HelloSign webhook signature verification failed.')
    }

    const sigReq = (payload.signature_request || {}) as HelloSignSignatureRequestRaw
    const normalized: EsignWebhookEvent = {
      type: mapEventType(eventType),
      signatureRequestId: String(sigReq.signature_request_id || ''),
      raw: payload,
    }
    const signerEmail = (event.event_metadata as Record<string, unknown> | undefined)?.[
      'related_signature_id'
    ]
      ? // HelloSign sometimes reports the signer email on the matching
        // signature inside signatures[]
        sigReq.signatures?.find((s) => s.status_code === 'signed' || s.status_code === 'declined')
          ?.signer_email_address
      : sigReq.signatures?.[0]?.signer_email_address
    if (signerEmail) normalized.signerEmail = signerEmail
    return normalized
  } catch (err) {
    logger.error('HelloSign processWebhook error:', err)
    throw sanitizeError(err, 'HelloSign processWebhook failed.')
  }
}

/**
 * The HelloSign provider implementing the `EsignProvider` interface.
 */
export const provider: EsignProvider = {
  createSignatureRequest,
  getSignatureRequest,
  cancelSignatureRequest,
  getSignedDocument,
  processWebhook,
}

/**
 * Unit tests for the AgentMail inbound-email provider.
 *
 * The network is the only thing mocked: `fetch` is stubbed at the global
 * and every AgentMail call the provider makes is asserted on its URL,
 * method, headers and body. Signing uses real `node:crypto`, computed
 * exactly the way Svix computes it.
 */

import { Buffer } from 'node:buffer'
import { createHmac } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AgentMailApiError } from '../api.js'
import {
  _resetInboxMemo,
  parseWebhookPayload,
  provider,
  replyTo,
  supportsReply,
  verifySignature,
} from '../provider.js'

const SECRET_BYTES = Buffer.from('agentmail-test-secret-0123456789')
const TEST_SECRET = `whsec_${SECRET_BYTES.toString('base64')}`
const TEST_API_KEY = 'am_test_key_1234567890'
const DEFAULT_BASE = 'https://api.agentmail.to'

const INBOX_ID = 'inbox_abc123'
const MESSAGE_ID = '<orig-1@mail.example.com>'
const ENCODED_MESSAGE_ID = encodeURIComponent(MESSAGE_ID)
const MESSAGE_PATH = `/v0/inboxes/${INBOX_ID}/messages/${ENCODED_MESSAGE_ID}`

/**
 * Signs a body the way Svix does: HMAC-SHA256 over `${id}.${timestamp}.${body}`
 * keyed by the decoded secret, base64, sent as `v1,<sig>`.
 */
const signHeaders = (
  body: Buffer | string,
  options: { id?: string; timestamp?: number; keyBytes?: Buffer; prefix?: string } = {},
): Record<string, string> => {
  const id = options.id ?? 'msg_2abcXYZ'
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000)
  const keyBytes = options.keyBytes ?? SECRET_BYTES
  const prefix = options.prefix ?? 'svix'
  const bodyBytes = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8')
  const signature = createHmac('sha256', keyBytes)
    .update(Buffer.concat([Buffer.from(`${id}.${String(timestamp)}.`, 'utf8'), bodyBytes]))
    .digest('base64')
  return {
    [`${prefix}-id`]: id,
    [`${prefix}-timestamp`]: String(timestamp),
    [`${prefix}-signature`]: `v1,${signature}`,
  }
}

const fullEvent = (): Record<string, unknown> => ({
  type: 'event',
  event_type: 'message.received',
  event_id: 'evt_123abc',
  message: {
    inbox_id: INBOX_ID,
    thread_id: 'thd_ghi789',
    message_id: MESSAGE_ID,
    labels: ['received'],
    timestamp: '2026-09-01T10:00:00Z',
    from: 'Alice <alice@example.com>',
    to: ['support@agent.agentmail.to', 'ops@agent.agentmail.to'],
    cc: ['"Manager, M." <mgr@example.com>'],
    subject: 'Help me please',
    preview: 'My printer is on fire.',
    text: 'My printer is on fire.',
    html: '<p>My printer is on fire.</p>',
    attachments: [
      {
        attachment_id: 'att_1',
        size: 5,
        filename: 'photo.png',
        content_type: 'image/png',
        content_disposition: 'inline',
        content_id: '<inline-1>',
      },
      { attachment_id: 'att_2', size: 3, filename: 'invoice.pdf', content_type: 'application/pdf' },
    ],
    in_reply_to: '<prev-1@mail.example.com>',
    references: ['<prev-1@mail.example.com>', '<prev-0@mail.example.com>'],
    headers: { From: 'Alice <alice@example.com>', 'X-Custom': 'one' },
    size: 1234,
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:05Z',
  },
  thread: { inbox_id: INBOX_ID, thread_id: 'thd_ghi789', message_count: 1 },
})

const minimalEvent = (): Record<string, unknown> => ({
  event_type: 'message.received',
  event_id: 'evt_min',
  message: {
    inbox_id: INBOX_ID,
    message_id: MESSAGE_ID,
    from: 'alice@example.com',
    to: ['support@agent.agentmail.to'],
    text: 'hi',
  },
})

const jsonResponse = (body: unknown, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  })

const mockFetch = vi.fn<typeof fetch>()

/** Reads a request header off a recorded fetch call, case-insensitively. */
const requestHeader = (callIndex: number, name: string): string | null => {
  const init = mockFetch.mock.calls[callIndex]?.[1]
  return new Headers(init?.headers).get(name)
}

const requestUrl = (callIndex: number): string => String(mockFetch.mock.calls[callIndex]?.[0])

const requestJson = (callIndex: number): Record<string, unknown> => {
  const init = mockFetch.mock.calls[callIndex]?.[1]
  const parsed: unknown = JSON.parse(String(init?.body))
  if (typeof parsed !== 'object' || parsed === null)
    throw new Error('request body is not an object')
  return parsed as Record<string, unknown>
}

/** Routes the two-step attachment download for the full fixture. */
const routeAttachmentDownloads = (): void => {
  mockFetch.mockImplementation(async (input) => {
    const url = String(input)
    if (url === `${DEFAULT_BASE}${MESSAGE_PATH}/attachments/att_1`) {
      return jsonResponse({
        attachment_id: 'att_1',
        size: 5,
        filename: 'photo.png',
        content_type: 'image/png',
        download_url: 'https://files.agentmail.example/att_1?sig=one',
        expires_at: '2026-09-01T11:00:00Z',
      })
    }
    if (url === 'https://files.agentmail.example/att_1?sig=one') {
      return new Response(Buffer.from('hello'), { status: 200 })
    }
    if (url === `${DEFAULT_BASE}${MESSAGE_PATH}/attachments/att_2`) {
      return jsonResponse({
        attachment_id: 'att_2',
        size: 3,
        download_url: 'https://files.agentmail.example/att_2?sig=two',
      })
    }
    if (url === 'https://files.agentmail.example/att_2?sig=two') {
      return new Response(Buffer.from('PDF'), { status: 200 })
    }
    throw new Error(`unexpected fetch ${url}`)
  })
}

const originalEnv = process.env

beforeEach(() => {
  process.env = { ...originalEnv }
  process.env.AGENTMAIL_API_KEY = TEST_API_KEY
  process.env.AGENTMAIL_WEBHOOK_SECRET = TEST_SECRET
  delete process.env.AGENTMAIL_INBOX_ID
  delete process.env.AGENTMAIL_BASE_URL
  delete process.env.AGENTMAIL_INBOUND_REPLAY_WINDOW_SECONDS
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
  _resetInboxMemo()
})

afterEach(() => {
  process.env = originalEnv
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('verifySignature', () => {
  const body = JSON.stringify(minimalEvent())

  it('returns true for a fresh, correctly-signed payload', async () => {
    expect(await verifySignature(signHeaders(body), body)).toBe(true)
  })

  it('returns true when the body is supplied as a Buffer', async () => {
    const buffer = Buffer.from(body, 'utf8')
    expect(await verifySignature(signHeaders(buffer), buffer)).toBe(true)
  })

  it('accepts the Standard-Webhooks `webhook-*` header aliases', async () => {
    expect(await verifySignature(signHeaders(body, { prefix: 'webhook' }), body)).toBe(true)
  })

  it('reads the signing headers case-insensitively', async () => {
    const signed = signHeaders(body)
    const headers = {
      'Svix-Id': signed['svix-id'],
      'SVIX-TIMESTAMP': signed['svix-timestamp'],
      'Svix-Signature': signed['svix-signature'],
    }
    expect(await verifySignature(headers, body)).toBe(true)
  })

  it('matches any one of several signatures (secret rotation)', async () => {
    const signed = signHeaders(body)
    const rotated = {
      ...signed,
      'svix-signature': `v1,${'A'.repeat(43)}= ${signed['svix-signature']}`,
    }
    expect(await verifySignature(rotated, body)).toBe(true)
  })

  it('returns false when the signature is wrong', async () => {
    const signed = signHeaders(body)
    const forged = { ...signed, 'svix-signature': `v1,${'A'.repeat(43)}=` }
    expect(await verifySignature(forged, body)).toBe(false)
  })

  it('returns false when signed with a different secret', async () => {
    const other = signHeaders(body, { keyBytes: Buffer.from('some-other-secret-bytes-000000') })
    expect(await verifySignature(other, body)).toBe(false)
  })

  it('returns false when the body was tampered with after signing', async () => {
    const signed = signHeaders(body)
    expect(await verifySignature(signed, body.replace('"hi"', '"hacked"'))).toBe(false)
  })

  it('returns false when the timestamp is older than the replay window', async () => {
    const stale = signHeaders(body, { timestamp: Math.floor(Date.now() / 1000) - 10_000 })
    expect(await verifySignature(stale, body)).toBe(false)
  })

  it('returns false when the timestamp is not a plain integer', async () => {
    const signed = signHeaders(body)
    expect(await verifySignature({ ...signed, 'svix-timestamp': 'not-a-number' }, body)).toBe(false)
    expect(await verifySignature({ ...signed, 'svix-timestamp': '1700000000abc' }, body)).toBe(
      false,
    )
  })

  it('returns false when signing headers are missing', async () => {
    expect(await verifySignature({}, body)).toBe(false)
    const { 'svix-signature': _dropped, ...withoutSignature } = signHeaders(body)
    expect(await verifySignature(withoutSignature, body)).toBe(false)
  })

  it('returns false when only non-v1 signatures are present', async () => {
    const signed = signHeaders(body)
    const v2 = { ...signed, 'svix-signature': signed['svix-signature']!.replace('v1,', 'v2,') }
    expect(await verifySignature(v2, body)).toBe(false)
  })

  it('throws a tagged config.notConfigured error (not a bare false) when AGENTMAIL_WEBHOOK_SECRET is unset', async () => {
    delete process.env.AGENTMAIL_WEBHOOK_SECRET
    const signed = signHeaders(body)

    // A misconfigured server must not resolve `false` — that is
    // indistinguishable from a forged/stale/malformed webhook (401 with no
    // trace). It throws a tagged 503 instead, naming the missing env var.
    await expect(verifySignature(signed, body)).rejects.toMatchObject({
      statusCode: 503,
      errorKey: 'config.notConfigured',
    })
    await expect(verifySignature(signed, body)).rejects.toThrow(/AGENTMAIL_WEBHOOK_SECRET/u)
  })

  it('honours AGENTMAIL_INBOUND_REPLAY_WINDOW_SECONDS override', async () => {
    process.env.AGENTMAIL_INBOUND_REPLAY_WINDOW_SECONDS = '1'
    const tenSecondsAgo = signHeaders(body, { timestamp: Math.floor(Date.now() / 1000) - 10 })
    expect(await verifySignature(tenSecondsAgo, body)).toBe(false)
  })

  it('reproduces the signature Svix publishes for its worked example', async () => {
    // https://docs.svix.com/receiving/verifying-payloads/how-manual — the
    // documented secret / id / timestamp / body / expected signature. Pins
    // the algorithm to the reference, not to our own signing helper.
    process.env.AGENTMAIL_WEBHOOK_SECRET = 'whsec_plJ3nmyCDGBKInavdOK15jsl'
    vi.useFakeTimers()
    vi.setSystemTime(1_731_705_121 * 1000)
    const headers = {
      'svix-id': 'msg_loFOjxBNrRLzqYUf',
      'svix-timestamp': '1731705121',
      'svix-signature': 'v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0=',
    }
    expect(await verifySignature(headers, '{"event_type":"ping","data":{"success":true}}')).toBe(
      true,
    )
  })
})

describe('parseWebhookPayload', () => {
  it('maps a full message.received payload onto the normalized InboundEmail shape, downloading attachments', async () => {
    routeAttachmentDownloads()

    const email = await parseWebhookPayload({}, JSON.stringify(fullEvent()))

    expect(email.id).toBe(MESSAGE_ID) // verbatim, with angle brackets
    expect(email.messageId).toBe('orig-1@mail.example.com')
    expect(email.from).toBe('Alice <alice@example.com>')
    expect(email.to).toEqual(['support@agent.agentmail.to', 'ops@agent.agentmail.to'])
    expect(email.cc).toEqual(['"Manager, M." <mgr@example.com>'])
    expect(email.subject).toBe('Help me please')
    expect(email.textBody).toBe('My printer is on fire.')
    expect(email.htmlBody).toBe('<p>My printer is on fire.</p>')
    expect(email.inReplyTo).toBe('prev-1@mail.example.com')
    expect(email.references).toEqual(['prev-1@mail.example.com', 'prev-0@mail.example.com'])
    expect(email.headers).toEqual({ from: 'Alice <alice@example.com>', 'x-custom': 'one' })
    expect(email.receivedAt).toEqual(new Date('2026-09-01T10:00:00Z'))

    expect(email.attachments).toEqual([
      {
        name: 'photo.png',
        contentType: 'image/png',
        contentBase64: Buffer.from('hello').toString('base64'),
        sizeBytes: 5,
        contentId: '<inline-1>',
      },
      {
        name: 'invoice.pdf',
        contentType: 'application/pdf',
        contentBase64: Buffer.from('PDF').toString('base64'),
        sizeBytes: 3,
      },
    ])

    // Two-step download per attachment: metadata (authenticated) → presigned URL (NOT authenticated).
    expect(mockFetch).toHaveBeenCalledTimes(4)
    expect(requestUrl(0)).toBe(`${DEFAULT_BASE}${MESSAGE_PATH}/attachments/att_1`)
    expect(requestHeader(0, 'authorization')).toBe(`Bearer ${TEST_API_KEY}`)
    expect(requestUrl(1)).toBe('https://files.agentmail.example/att_1?sig=one')
    expect(requestHeader(1, 'authorization')).toBeNull()
    expect(requestUrl(2)).toBe(`${DEFAULT_BASE}${MESSAGE_PATH}/attachments/att_2`)
    expect(requestUrl(3)).toBe('https://files.agentmail.example/att_2?sig=two')
  })

  it('URL-encodes the angle-bracketed message id in API paths', async () => {
    routeAttachmentDownloads()
    await parseWebhookPayload({}, JSON.stringify(fullEvent()))
    expect(requestUrl(0)).toContain('/messages/%3Corig-1%40mail.example.com%3E/attachments/')
  })

  it('accepts Buffer bodies and already-parsed objects', async () => {
    const fromBuffer = await parseWebhookPayload({}, Buffer.from(JSON.stringify(minimalEvent())))
    const fromObject = await parseWebhookPayload({}, minimalEvent())
    expect(fromBuffer.from).toBe('alice@example.com')
    expect(fromObject.from).toBe('alice@example.com')
    expect(fromObject.to).toEqual(['support@agent.agentmail.to'])
    expect(fromObject.textBody).toBe('hi')
  })

  it('reads the `from_` spelling used by the webhooks guide', async () => {
    const event = minimalEvent()
    const message = event.message as Record<string, unknown>
    delete message.from
    message.from_ = 'Bob <bob@example.com>'
    const email = await parseWebhookPayload({}, event)
    expect(email.from).toBe('Bob <bob@example.com>')
  })

  it('makes no network call for a message with bodies and no attachments', async () => {
    const email = await parseWebhookPayload({}, minimalEvent())
    expect(mockFetch).not.toHaveBeenCalled()
    expect(email.cc).toBeUndefined()
    expect(email.attachments).toBeUndefined()
    expect(email.htmlBody).toBeUndefined()
    expect(email.inReplyTo).toBeUndefined()
    expect(email.references).toBeUndefined()
    expect(email.headers).toEqual({})
    expect(email.subject).toBe('')
  })

  it('hydrates text/html via GET message when the webhook omitted both (1 MB cap)', async () => {
    const event = minimalEvent()
    const message = event.message as Record<string, unknown>
    delete message.text
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        inbox_id: 'ignored-in-favour-of-the-webhook',
        message_id: 'also-ignored',
        subject: 'Big one',
        text: 'a'.repeat(64),
        html: '<p>big</p>',
        headers: { 'X-Big': 'yes' },
      }),
    )

    const email = await parseWebhookPayload({}, event)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(requestUrl(0)).toBe(`${DEFAULT_BASE}${MESSAGE_PATH}`)
    expect(mockFetch.mock.calls[0]?.[1]?.method).toBe('GET')
    expect(requestHeader(0, 'authorization')).toBe(`Bearer ${TEST_API_KEY}`)
    expect(email.id).toBe(MESSAGE_ID)
    expect(email.subject).toBe('Big one')
    expect(email.textBody).toBe('a'.repeat(64))
    expect(email.htmlBody).toBe('<p>big</p>')
    expect(email.headers).toEqual({ 'x-big': 'yes' })
  })

  it('throws the tagged config error (without calling fetch) when hydration is needed and AGENTMAIL_API_KEY is unset', async () => {
    delete process.env.AGENTMAIL_API_KEY
    const event = minimalEvent()
    delete (event.message as Record<string, unknown>).text

    await expect(parseWebhookPayload({}, event)).rejects.toMatchObject({
      statusCode: 503,
      errorKey: 'config.notConfigured',
    })
    await expect(parseWebhookPayload({}, event)).rejects.toThrow(/AGENTMAIL_API_KEY/u)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('throws on a body that is not JSON', async () => {
    await expect(parseWebhookPayload({}, 'not json')).rejects.toThrow(/not valid JSON/u)
  })

  it('rejects events that are not inbound messages, naming the event type', async () => {
    const event = { ...minimalEvent(), event_type: 'message.sent' }
    await expect(parseWebhookPayload({}, event)).rejects.toThrow(
      /"message\.sent" is not an inbound message/u,
    )
  })

  it('accepts the message.received.* variants', async () => {
    const email = await parseWebhookPayload(
      {},
      { ...minimalEvent(), event_type: 'message.received.spam' },
    )
    expect(email.id).toBe(MESSAGE_ID)
  })

  it('rejects payloads without event_type or without message ids', async () => {
    await expect(parseWebhookPayload({}, { message: {} })).rejects.toThrow(/no `event_type`/u)
    await expect(
      parseWebhookPayload({}, { event_type: 'message.received', message: { inbox_id: INBOX_ID } }),
    ).rejects.toThrow(/`inbox_id` and `message_id`/u)
    await expect(parseWebhookPayload({}, '[]')).rejects.toThrow(/not a JSON object/u)
  })

  it('rejects events for another inbox when AGENTMAIL_INBOX_ID is set, and accepts its own', async () => {
    process.env.AGENTMAIL_INBOX_ID = 'inbox_other'
    await expect(parseWebhookPayload({}, minimalEvent())).rejects.toThrow(
      /inbox "inbox_abc123", not the configured AGENTMAIL_INBOX_ID/u,
    )

    process.env.AGENTMAIL_INBOX_ID = INBOX_ID
    const email = await parseWebhookPayload({}, minimalEvent())
    expect(email.id).toBe(MESSAGE_ID)
  })

  it('propagates an AgentMailApiError (with Retry-After) from an attachment download', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        { name: 'RateLimitError', code: 'rate_limit_exceeded', message: 'Slow down.' },
        { status: 429, headers: { 'retry-after': '12' } },
      ),
    )

    const failure = parseWebhookPayload({}, JSON.stringify(fullEvent()))
    await expect(failure).rejects.toBeInstanceOf(AgentMailApiError)
    await expect(failure).rejects.toMatchObject({
      statusCode: 429,
      code: 'rate_limit_exceeded',
      retryAfterSeconds: 12,
    })
  })

  it('skips attachment entries without an attachment_id instead of aborting the parse', async () => {
    const event = minimalEvent()
    ;(event.message as Record<string, unknown>).attachments = [{ size: 1 }, 'junk']
    const email = await parseWebhookPayload({}, event)
    expect(email.attachments).toBeUndefined()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('falls back from an invalid timestamp to created_at, then to now', async () => {
    const withCreatedAt = minimalEvent()
    Object.assign(withCreatedAt.message as Record<string, unknown>, {
      timestamp: 'garbage',
      created_at: '2026-09-02T00:00:00Z',
    })
    expect((await parseWebhookPayload({}, withCreatedAt)).receivedAt).toEqual(
      new Date('2026-09-02T00:00:00Z'),
    )

    const before = Date.now()
    const now = (await parseWebhookPayload({}, minimalEvent())).receivedAt.getTime()
    expect(now).toBeGreaterThanOrEqual(before)
    expect(now).toBeLessThanOrEqual(Date.now())
  })

  it('honours AGENTMAIL_BASE_URL (trailing slash stripped) for API calls', async () => {
    process.env.AGENTMAIL_BASE_URL = 'https://api.agentmail.eu/'
    const event = minimalEvent()
    delete (event.message as Record<string, unknown>).text
    mockFetch.mockResolvedValueOnce(jsonResponse({ text: 'eu' }))

    await parseWebhookPayload({}, event)
    expect(requestUrl(0)).toBe(`https://api.agentmail.eu${MESSAGE_PATH}`)
  })
})

describe('replyTo', () => {
  const inboundEmail = async (): Promise<Awaited<ReturnType<typeof parseWebhookPayload>>> =>
    parseWebhookPayload({}, minimalEvent())

  it('POSTs to the reply endpoint of the inbox recorded at parse time', async () => {
    const email = await inboundEmail()
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message_id: '<reply-1@agentmail.to>', thread_id: 'thd_1' }),
    )

    const result = await replyTo(email, {
      textBody: 'We received your request.',
      htmlBody: '<p>We received your request.</p>',
      headers: { 'X-Ticket': 'T-1' },
    })

    expect(result).toEqual({ id: '<reply-1@agentmail.to>' })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(requestUrl(0)).toBe(`${DEFAULT_BASE}${MESSAGE_PATH}/reply`)
    expect(mockFetch.mock.calls[0]?.[1]?.method).toBe('POST')
    expect(requestHeader(0, 'authorization')).toBe(`Bearer ${TEST_API_KEY}`)
    expect(requestHeader(0, 'content-type')).toBe('application/json')
    expect(requestJson(0)).toEqual({
      to: 'alice@example.com',
      text: 'We received your request.',
      html: '<p>We received your request.</p>',
      headers: { 'X-Ticket': 'T-1' },
    })
  })

  it('resolves the inbox from AGENTMAIL_INBOX_ID when the message was parsed elsewhere', async () => {
    const email = await inboundEmail()
    _resetInboxMemo() // simulate a later request / restarted process
    process.env.AGENTMAIL_INBOX_ID = 'inbox_configured'
    mockFetch.mockResolvedValueOnce(jsonResponse({ message_id: '<r@agentmail.to>' }))

    await replyTo(email, { textBody: 'later' })
    expect(requestUrl(0)).toBe(
      `${DEFAULT_BASE}/v0/inboxes/inbox_configured/messages/${ENCODED_MESSAGE_ID}/reply`,
    )
  })

  it('throws a clear error (without calling fetch) when the inbox is unknown', async () => {
    const email = await inboundEmail()
    _resetInboxMemo()
    await expect(replyTo(email, { textBody: 'later' })).rejects.toThrow(/Set AGENTMAIL_INBOX_ID/u)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('translates attachments to base64 `content` entries, inline when a contentId is set', async () => {
    const email = await inboundEmail()
    mockFetch.mockResolvedValueOnce(jsonResponse({ message_id: '<r@agentmail.to>' }))
    const base64 = Buffer.from('hello world').toString('base64')

    await replyTo(email, {
      textBody: 'with attachment',
      attachments: [
        { name: 'note.txt', contentType: 'text/plain', contentBase64: base64, contentId: 'cid-1' },
        { name: 'plain.txt', contentType: 'text/plain', contentBase64: base64 },
      ],
    })

    expect(requestJson(0).attachments).toEqual([
      {
        filename: 'note.txt',
        content_type: 'text/plain',
        content: base64,
        content_id: 'cid-1',
        content_disposition: 'inline',
      },
      { filename: 'plain.txt', content_type: 'text/plain', content: base64 },
    ])
  })

  it('does not forward reply.subject / reply.from — AgentMail threads from the inbox itself', async () => {
    const email = await inboundEmail()
    mockFetch.mockResolvedValueOnce(jsonResponse({ message_id: '<r@agentmail.to>' }))

    await replyTo(email, { subject: 'Ignored', from: 'someone-else@example.com', textBody: 'x' })
    const body = requestJson(0)
    expect(body).not.toHaveProperty('subject')
    expect(body).not.toHaveProperty('from')
    expect(body.to).toBe('alice@example.com')
  })

  it('maps a 401 error envelope to AgentMailApiError without leaking the API key', async () => {
    const email = await inboundEmail()
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          name: 'UnauthorizedError',
          code: 'unknown_api_key',
          message: 'API key not recognised.',
          fix: 'Create a new key in the console.',
          docs: 'https://docs.agentmail.to/errors',
        },
        { status: 401 },
      ),
    )

    const failure = replyTo(email, { textBody: 'x' })
    await expect(failure).rejects.toBeInstanceOf(AgentMailApiError)
    await expect(failure).rejects.toMatchObject({
      statusCode: 401,
      code: 'unknown_api_key',
      errorName: 'UnauthorizedError',
      fix: 'Create a new key in the console.',
      retryAfterSeconds: undefined,
    })
    await expect(failure).rejects.toThrow(
      /POST \/v0\/inboxes\/inbox_abc123\/messages\/.* failed with HTTP 401 \(unknown_api_key\): API key not recognised\. Create a new key in the console\./u,
    )
    await expect(failure).rejects.not.toThrow(new RegExp(TEST_API_KEY, 'u'))
  })

  it('maps a 429 with an HTTP-date Retry-After', async () => {
    const email = await inboundEmail()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-01T10:00:00Z'))
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        { code: 'rate_limit_exceeded', message: 'Too many requests.' },
        { status: 429, headers: { 'retry-after': 'Tue, 01 Sep 2026 10:00:30 GMT' } },
      ),
    )

    await expect(replyTo(email, { textBody: 'x' })).rejects.toMatchObject({
      statusCode: 429,
      code: 'rate_limit_exceeded',
      retryAfterSeconds: 30,
    })
  })

  it('maps a non-JSON error body (AgentMail 413 is bare text) to a status + snippet', async () => {
    const email = await inboundEmail()
    mockFetch.mockResolvedValueOnce(new Response('Request entity too large', { status: 413 }))

    const failure = replyTo(email, { textBody: 'x' })
    await expect(failure).rejects.toMatchObject({ statusCode: 413, code: undefined })
    await expect(failure).rejects.toThrow(/HTTP 413: Request entity too large/u)
  })

  it('throws the tagged config error when AGENTMAIL_API_KEY is unset', async () => {
    const email = await inboundEmail()
    delete process.env.AGENTMAIL_API_KEY
    await expect(replyTo(email, { textBody: 'x' })).rejects.toMatchObject({
      statusCode: 503,
      errorKey: 'config.notConfigured',
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('provider object', () => {
  it('implements the InboundEmailProvider interface', () => {
    expect(provider.parseWebhookPayload).toBeTypeOf('function')
    expect(provider.verifySignature).toBeTypeOf('function')
    expect(provider.replyTo).toBeTypeOf('function')
    expect(provider.supportsReply()).toBe(true)
    expect(supportsReply()).toBe(true)
  })
})

/**
 * Unit tests for the Mailgun Routes inbound-email provider.
 */

import { Buffer } from 'node:buffer'
import { createHmac } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockSendMail = vi.fn()

vi.mock('@molecule/api-emails', () => ({
  sendMail: (msg: unknown) => mockSendMail(msg),
}))

const TEST_API_KEY = 'key-test-1234567890'

const buildSignedFormBody = (
  fields: Record<string, string>,
  apiKey: string = TEST_API_KEY,
  timestamp: number = Math.floor(Date.now() / 1000),
  token: string = 'token-abc',
): string => {
  const signature = createHmac('sha256', apiKey)
    .update(String(timestamp) + token)
    .digest('hex')
  const params = new URLSearchParams({
    timestamp: String(timestamp),
    token,
    signature,
    ...fields,
  })
  return params.toString()
}

describe('verifySignature', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.MAILGUN_API_KEY = TEST_API_KEY
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  it('returns true for a fresh, correctly-signed payload', async () => {
    const { verifySignature } = await import('../provider.js')
    const body = buildSignedFormBody({ From: 'a@x', Subject: 'hi' })
    expect(await verifySignature({}, body)).toBe(true)
  })

  it('returns true when body is supplied as a Buffer', async () => {
    const { verifySignature } = await import('../provider.js')
    const body = Buffer.from(buildSignedFormBody({ Subject: 'hi' }), 'utf8')
    expect(await verifySignature({}, body)).toBe(true)
  })

  it('returns false when the signature is wrong', async () => {
    const { verifySignature } = await import('../provider.js')
    // Manually craft a body whose signature is incorrect.
    const ts = Math.floor(Date.now() / 1000)
    const body = new URLSearchParams({
      timestamp: String(ts),
      token: 'tok',
      signature: 'a'.repeat(64),
      Subject: 'hi',
    }).toString()
    expect(await verifySignature({}, body)).toBe(false)
  })

  it('returns false when the timestamp is older than the replay window', async () => {
    const { verifySignature } = await import('../provider.js')
    const stale = Math.floor(Date.now() / 1000) - 10_000
    const body = buildSignedFormBody({ Subject: 'old' }, TEST_API_KEY, stale)
    expect(await verifySignature({}, body)).toBe(false)
  })

  it('returns false when timestamp is non-numeric', async () => {
    const { verifySignature } = await import('../provider.js')
    const body = new URLSearchParams({
      timestamp: 'not-a-number',
      token: 'tok',
      signature: 'a'.repeat(64),
    }).toString()
    expect(await verifySignature({}, body)).toBe(false)
  })

  it('returns false when signing fields are missing', async () => {
    const { verifySignature } = await import('../provider.js')
    expect(await verifySignature({}, 'Subject=hi')).toBe(false)
  })

  it('throws a tagged config.notConfigured error (not a leaked-key, not a bare false) when MAILGUN_API_KEY is unset', async () => {
    delete process.env.MAILGUN_API_KEY
    vi.resetModules()
    const { verifySignature } = await import('../provider.js')
    const body = buildSignedFormBody({ Subject: 'hi' })

    // A misconfigured server must not resolve `false` — that is
    // indistinguishable from a forged/stale/malformed webhook (401 with no
    // trace). It throws a tagged 503 instead, and the message names the
    // missing env var without ever including the actual key value.
    await expect(verifySignature({}, body)).rejects.toMatchObject({
      statusCode: 503,
      errorKey: 'config.notConfigured',
    })
    await expect(verifySignature({}, body)).rejects.toThrow(/MAILGUN_API_KEY/u)
  })

  it('honours MAILGUN_INBOUND_REPLAY_WINDOW_SECONDS override', async () => {
    process.env.MAILGUN_INBOUND_REPLAY_WINDOW_SECONDS = '1'
    vi.resetModules()
    const { verifySignature } = await import('../provider.js')
    const tenSecondsAgo = Math.floor(Date.now() / 1000) - 10
    const body = buildSignedFormBody({ Subject: 'old' }, TEST_API_KEY, tenSecondsAgo)
    expect(await verifySignature({}, body)).toBe(false)
  })

  it('uppercase signature still verifies (case-insensitive hex)', async () => {
    const { verifySignature } = await import('../provider.js')
    const ts = Math.floor(Date.now() / 1000)
    const token = 'tok-upper'
    const sig = createHmac('sha256', TEST_API_KEY)
      .update(String(ts) + token)
      .digest('hex')
      .toUpperCase()
    const body = new URLSearchParams({
      timestamp: String(ts),
      token,
      signature: sig,
    }).toString()
    expect(await verifySignature({}, body)).toBe(true)
  })
})

describe('parseWebhookPayload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('maps Mailgun field names onto the normalized InboundEmail shape', async () => {
    const { parseWebhookPayload } = await import('../provider.js')
    const ts = 1_700_000_000
    const body = new URLSearchParams({
      timestamp: String(ts),
      token: 'tok',
      signature: 'sig',
      From: 'Alice <alice@example.com>',
      To: 'support@helpdesk.example, ops@helpdesk.example',
      Cc: '"Manager, M." <mgr@example.com>',
      Subject: 'Help me please',
      'body-plain': 'My printer is on fire.',
      'body-html': '<p>My printer is on fire.</p>',
      'Message-Id': '<abc-123@mail.example.com>',
      'In-Reply-To': '<prev-1@mail.example.com>',
      References: '<prev-1@mail.example.com> <prev-0@mail.example.com>',
      'message-headers': JSON.stringify([
        ['From', 'Alice <alice@example.com>'],
        ['X-Custom', 'one'],
      ]),
    }).toString()

    const email = await parseWebhookPayload({}, body)

    expect(email.from).toBe('Alice <alice@example.com>')
    expect(email.to).toEqual(['support@helpdesk.example', 'ops@helpdesk.example'])
    expect(email.cc).toEqual(['"Manager, M." <mgr@example.com>'])
    expect(email.subject).toBe('Help me please')
    expect(email.textBody).toBe('My printer is on fire.')
    expect(email.htmlBody).toBe('<p>My printer is on fire.</p>')
    expect(email.messageId).toBe('abc-123@mail.example.com')
    expect(email.id).toBe('abc-123@mail.example.com')
    expect(email.inReplyTo).toBe('prev-1@mail.example.com')
    expect(email.references).toEqual(['prev-1@mail.example.com', 'prev-0@mail.example.com'])
    expect(email.headers.from).toBe('Alice <alice@example.com>')
    expect(email.receivedAt).toEqual(new Date(ts * 1000))
    expect(email.attachments).toBeUndefined()
  })

  it('decodes attachments from form fields', async () => {
    const { parseWebhookPayload } = await import('../provider.js')
    const att1 = JSON.stringify({
      name: 'photo.png',
      'content-type': 'image/png',
      size: 1024,
      content: Buffer.from('hello').toString('base64'),
      'content-id': '<inline-1>',
    })
    const att2 = JSON.stringify({
      name: 'invoice.pdf',
      'content-type': 'application/pdf',
      size: 2048,
      content: Buffer.from('PDF').toString('base64'),
    })
    const body = new URLSearchParams({
      Subject: 'with attachments',
      'attachment-count': '2',
      'attachment-1': att1,
      'attachment-2': att2,
    }).toString()

    const email = await parseWebhookPayload({}, body)
    expect(email.attachments).toHaveLength(2)
    expect(email.attachments?.[0]).toEqual({
      name: 'photo.png',
      contentType: 'image/png',
      contentBase64: Buffer.from('hello').toString('base64'),
      sizeBytes: 1024,
      contentId: '<inline-1>',
    })
    expect(email.attachments?.[1]).toMatchObject({
      name: 'invoice.pdf',
      contentType: 'application/pdf',
    })
    expect(email.attachments?.[1]?.contentId).toBeUndefined()
  })

  it('falls back to a deterministic hashed id (NOT the per-request token) when Message-Id is absent', async () => {
    const { parseWebhookPayload } = await import('../provider.js')
    const fields = {
      From: 'alice@example.com',
      Subject: 'no message-id',
      'message-headers': JSON.stringify([['Date', 'Mon, 01 Jan 2024 00:00:00 +0000']]),
    }

    // Two "delivery attempts" of the same message carry DIFFERENT per-request
    // tokens (as Mailgun regenerates on every retry) but identical mail
    // content — the fallback id must ignore the token and still match.
    const attempt1 = new URLSearchParams({ token: 'token-1', ...fields }).toString()
    const attempt2 = new URLSearchParams({ token: 'token-2', ...fields }).toString()

    const email1 = await parseWebhookPayload({}, attempt1)
    const email2 = await parseWebhookPayload({}, attempt2)

    expect(email1.id).not.toBe('token-1')
    expect(email1.id).toMatch(/^mailgun-[0-9a-f]{32}$/u)
    expect(email1.id).toBe(email2.id)
  })

  it('skips attachments that fail to JSON-parse', async () => {
    const { parseWebhookPayload } = await import('../provider.js')
    const body = new URLSearchParams({
      'attachment-count': '2',
      'attachment-1': 'not json',
      'attachment-2': JSON.stringify({
        name: 'ok.txt',
        'content-type': 'text/plain',
        size: 4,
        content: Buffer.from('okok').toString('base64'),
      }),
    }).toString()
    const email = await parseWebhookPayload({}, body)
    expect(email.attachments).toHaveLength(1)
    expect(email.attachments?.[0]?.name).toBe('ok.txt')
  })

  it('accepts already-parsed object bodies', async () => {
    const { parseWebhookPayload } = await import('../provider.js')
    const email = await parseWebhookPayload(
      {},
      {
        From: 'alice@x',
        To: 'bob@y',
        Subject: 'preparsed',
        'body-plain': 'hi',
      },
    )
    expect(email.from).toBe('alice@x')
    expect(email.to).toEqual(['bob@y'])
    expect(email.textBody).toBe('hi')
  })
})

describe('replyTo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('dispatches via @molecule/api-emails sendMail with threading headers', async () => {
    mockSendMail.mockResolvedValue({
      accepted: ['alice@example.com'],
      rejected: [],
      messageId: 'reply-1',
    })

    const { replyTo } = await import('../provider.js')

    const email = {
      id: 'orig-1',
      from: 'alice@example.com',
      to: ['support@helpdesk.example'],
      subject: 'Help',
      headers: {},
      receivedAt: new Date(),
      messageId: 'orig-1',
      references: ['prev-0'],
    }

    const result = await replyTo(email, {
      textBody: 'We received your request.',
      htmlBody: '<p>We received your request.</p>',
    })

    expect(result.id).toBe('reply-1')
    expect(mockSendMail).toHaveBeenCalledTimes(1)
    const arg = mockSendMail.mock.calls[0][0]
    expect(arg.from).toBe('support@helpdesk.example')
    expect(arg.to).toBe('alice@example.com')
    expect(arg.subject).toBe('Re: Help')
    expect(arg.text).toBe('We received your request.')
    expect(arg.html).toBe('<p>We received your request.</p>')
    expect(arg.headers['In-Reply-To']).toBe('<orig-1>')
    expect(arg.headers.References).toBe('<prev-0> <orig-1>')
  })

  it('honours an explicit reply.from override', async () => {
    mockSendMail.mockResolvedValue({ accepted: [], rejected: [], messageId: 'm' })
    const { replyTo } = await import('../provider.js')

    await replyTo(
      {
        id: 'orig',
        from: 'a@x',
        to: ['b@y'],
        subject: 'S',
        headers: {},
        receivedAt: new Date(),
      },
      { from: 'override@desk.example', textBody: 'hi' },
    )

    expect(mockSendMail.mock.calls[0][0].from).toBe('override@desk.example')
  })

  it('throws when no reply.from is given and the inbound email has no recipient', async () => {
    const { replyTo } = await import('../provider.js')
    await expect(
      replyTo(
        {
          id: 'orig',
          from: 'a@x',
          to: [],
          subject: 'S',
          headers: {},
          receivedAt: new Date(),
        },
        { textBody: 'hi' },
      ),
    ).rejects.toThrow(/no `from` address/u)
    expect(mockSendMail).not.toHaveBeenCalled()
  })

  it('translates inbound attachments back to outbound buffers', async () => {
    mockSendMail.mockResolvedValue({ accepted: [], rejected: [], messageId: 'm' })
    const { replyTo } = await import('../provider.js')
    const base64 = Buffer.from('hello world').toString('base64')

    await replyTo(
      {
        id: 'orig',
        from: 'a@x',
        to: ['b@y'],
        subject: 'S',
        headers: {},
        receivedAt: new Date(),
      },
      {
        textBody: 'with attachment',
        attachments: [
          {
            name: 'note.txt',
            contentType: 'text/plain',
            contentBase64: base64,
            contentId: 'cid-1',
          },
        ],
      },
    )

    const arg = mockSendMail.mock.calls[0][0]
    expect(arg.attachments).toHaveLength(1)
    expect(arg.attachments[0]).toMatchObject({
      filename: 'note.txt',
      contentType: 'text/plain',
      cid: 'cid-1',
    })
    expect(Buffer.isBuffer(arg.attachments[0].content)).toBe(true)
    expect((arg.attachments[0].content as Buffer).toString('utf8')).toBe('hello world')
  })

  it('falls back to "Re: <subject>" when reply.subject is omitted', async () => {
    mockSendMail.mockResolvedValue({ accepted: [], rejected: [], messageId: 'm' })
    const { replyTo } = await import('../provider.js')
    await replyTo(
      {
        id: 'o',
        from: 'a@x',
        to: ['b@y'],
        subject: 'Original Subject',
        headers: {},
        receivedAt: new Date(),
      },
      { textBody: 'reply' },
    )
    expect(mockSendMail.mock.calls[0][0].subject).toBe('Re: Original Subject')
  })
})

describe('provider object', () => {
  it('implements the InboundEmailProvider interface', async () => {
    const { provider } = await import('../provider.js')
    expect(provider.parseWebhookPayload).toBeTypeOf('function')
    expect(provider.verifySignature).toBeTypeOf('function')
    expect(provider.replyTo).toBeTypeOf('function')
    expect(provider.supportsReply()).toBe(true)
  })
})

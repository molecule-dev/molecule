/**
 * Unit tests for the AWS SES inbound-email provider.
 *
 * `verifySignature` is exercised against an in-memory self-signed RSA
 * certificate; `fetch` is mocked to return that PEM whenever the
 * allowlisted `SigningCertURL` is requested. Reply dispatch is tested with
 * `@molecule/api-emails`'s `sendMail` mocked.
 */

import { Buffer } from 'node:buffer'
import { execFileSync } from 'node:child_process'
import { createSign, X509Certificate } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockSendMail = vi.fn()

vi.mock('@molecule/api-emails', () => ({
  sendMail: (msg: unknown) => mockSendMail(msg),
}))

/**
 * Generates a self-signed RSA key pair + X.509 PEM certificate using
 * OpenSSL at module load time. Reused across all signing tests so we only
 * pay the cost once. We shell out to `openssl` because Node's standard
 * `crypto` module can generate keys but cannot build X.509 certificates;
 * `openssl req -x509 -newkey rsa:2048 ...` does both in one shot.
 */
const buildSelfSignedCertPem = (): { certPem: string; privateKeyPem: string } => {
  const dir = mkdtempSync(join(tmpdir(), 'sns-test-cert-'))
  try {
    const keyPath = join(dir, 'key.pem')
    const certPath = join(dir, 'cert.pem')
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-keyout',
        keyPath,
        '-out',
        certPath,
        '-days',
        '7300',
        '-subj',
        '/CN=test-sns-signer',
      ],
      { stdio: 'pipe' },
    )
    return {
      certPem: readFileSync(certPath, 'utf8'),
      privateKeyPem: readFileSync(keyPath, 'utf8'),
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const { certPem, privateKeyPem } = buildSelfSignedCertPem()

// Sanity: the cert must parse — proves provider's createPublicKey() will
// accept it.
new X509Certificate(certPem)

const ALLOWED_CERT_URL = 'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-test.pem'

const buildSignedNotification = (
  overrides: {
    Type?: string
    Message?: string
    MessageId?: string
    Subject?: string
    Timestamp?: string
    TopicArn?: string
    Token?: string
    SubscribeURL?: string
    certUrl?: string
  } = {},
): {
  payload: Record<string, unknown>
  body: string
} => {
  const Type = overrides.Type ?? 'Notification'
  const Message = overrides.Message ?? 'msg-body'
  const MessageId = overrides.MessageId ?? 'mid-1'
  const Subject = overrides.Subject
  const Timestamp = overrides.Timestamp ?? '2024-01-01T00:00:00Z'
  const TopicArn = overrides.TopicArn ?? 'arn:aws:sns:us-east-1:123:topic'
  const Token = overrides.Token
  const SubscribeURL = overrides.SubscribeURL
  const SigningCertURL = overrides.certUrl ?? ALLOWED_CERT_URL

  const isSubscription = Type === 'SubscriptionConfirmation' || Type === 'UnsubscribeConfirmation'
  const orderedKeys = isSubscription
    ? (['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'] as const)
    : (['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type'] as const)

  const fields: Record<string, string | undefined> = {
    Message,
    MessageId,
    Subject,
    SubscribeURL,
    Timestamp,
    Token,
    TopicArn,
    Type,
  }
  const parts: string[] = []
  for (const key of orderedKeys) {
    const v = fields[key]
    if (v === undefined) continue
    parts.push(key, v)
  }
  const canonical = `${parts.join('\n')}\n`

  const Signature = createSign('RSA-SHA1')
    .update(canonical, 'utf8')
    .sign(privateKeyPem)
    .toString('base64')

  const payload: Record<string, unknown> = {
    Type,
    MessageId,
    TopicArn,
    Message,
    Timestamp,
    SignatureVersion: '1',
    Signature,
    SigningCertURL,
  }
  if (Subject !== undefined) payload.Subject = Subject
  if (Token !== undefined) payload.Token = Token
  if (SubscribeURL !== undefined) payload.SubscribeURL = SubscribeURL

  return { payload, body: JSON.stringify(payload) }
}

const installFetchMock = (responder: (url: string) => Response | Promise<Response>): void => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url
      return responder(url)
    }),
  )
}

const okCertResponse = (): Response =>
  new Response(certPem, { status: 200, headers: { 'Content-Type': 'application/x-pem-file' } })

describe('verifySignature', () => {
  const originalEnv = process.env

  beforeEach(async () => {
    process.env = { ...originalEnv }
    vi.resetModules()
    const { _resetSigningCertCache } = await import('../provider.js')
    _resetSigningCertCache()
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
  })

  it('returns true for a valid SignatureVersion=1 notification', async () => {
    installFetchMock(() => okCertResponse())
    const { verifySignature } = await import('../provider.js')
    const { body } = buildSignedNotification({ Subject: 'hello' })
    expect(await verifySignature({}, body)).toBe(true)
  })

  it('returns true when the body is supplied as a Buffer', async () => {
    installFetchMock(() => okCertResponse())
    const { verifySignature } = await import('../provider.js')
    const { body } = buildSignedNotification()
    expect(await verifySignature({}, Buffer.from(body, 'utf8'))).toBe(true)
  })

  it('returns false when the signature is wrong', async () => {
    installFetchMock(() => okCertResponse())
    const { verifySignature } = await import('../provider.js')
    const { payload } = buildSignedNotification()
    payload.Signature = Buffer.from('bogus').toString('base64')
    expect(await verifySignature({}, JSON.stringify(payload))).toBe(false)
  })

  it('returns false when the body is not valid JSON', async () => {
    installFetchMock(() => okCertResponse())
    const { verifySignature } = await import('../provider.js')
    expect(await verifySignature({}, 'not json')).toBe(false)
  })

  it('returns false when SigningCertURL is not under the allowlist (SSRF defence)', async () => {
    const fetchSpy = vi.fn(() => okCertResponse())
    vi.stubGlobal('fetch', fetchSpy)
    const { verifySignature } = await import('../provider.js')
    const { body } = buildSignedNotification({ certUrl: 'https://attacker.example/cert.pem' })
    expect(await verifySignature({}, body)).toBe(false)
    // We MUST NOT have fetched the attacker URL.
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns false when SigningCertURL is HTTP (non-TLS)', async () => {
    const fetchSpy = vi.fn(() => okCertResponse())
    vi.stubGlobal('fetch', fetchSpy)
    const { verifySignature } = await import('../provider.js')
    const { body } = buildSignedNotification({
      certUrl: 'http://sns.us-east-1.amazonaws.com/cert.pem',
    })
    expect(await verifySignature({}, body)).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns false when the cert fetch fails', async () => {
    installFetchMock(() => new Response('', { status: 500 }))
    const { verifySignature } = await import('../provider.js')
    const { body } = buildSignedNotification()
    expect(await verifySignature({}, body)).toBe(false)
  })

  it('bounds the (uncached) cert fetch with an AbortSignal timeout', async () => {
    const fetchSpy = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      // Pre-fix, `fetch(url)` was called with no second argument at all, so
      // `init` would be `undefined` here and this assertion would fail.
      expect(init?.signal).toBeInstanceOf(AbortSignal)
      expect(init?.signal?.aborted).toBe(false)
      return okCertResponse()
    })
    vi.stubGlobal('fetch', fetchSpy)
    const { verifySignature } = await import('../provider.js')
    const { body } = buildSignedNotification()
    expect(await verifySignature({}, body)).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('FAILURE DISAMBIGUATION: an aborted (timed-out) cert fetch resolves `false` — never hangs, never throws', async () => {
    // Simulates a hanging SigningCertURL endpoint: fetch never resolves on
    // its own, only reacting to the AbortSignal firing (exactly how the real
    // undici `fetch` behaves once its signal aborts).
    const fetchSpy = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })
    })
    vi.stubGlobal('fetch', fetchSpy)
    const { verifySignature } = await import('../provider.js')
    const { body } = buildSignedNotification()

    const verifyPromise = verifySignature({}, body)
    // Let the microtask queue flush so `fetch` has been invoked and captured
    // its signal, then simulate the AbortSignal.timeout() firing — a unit
    // test cannot wait out the real 5s timeout.
    await Promise.resolve()
    const signal = fetchSpy.mock.calls[0]?.[1]?.signal
    expect(signal).toBeInstanceOf(AbortSignal)
    ;(signal as AbortSignal).dispatchEvent(new Event('abort'))

    expect(await verifyPromise).toBe(false)
  })

  it('returns false when the cert body is not a PEM certificate', async () => {
    installFetchMock(() => new Response('not-a-cert', { status: 200 }))
    const { verifySignature } = await import('../provider.js')
    const { body } = buildSignedNotification()
    expect(await verifySignature({}, body)).toBe(false)
  })

  it('rejects unknown SignatureVersion values', async () => {
    installFetchMock(() => okCertResponse())
    const { verifySignature } = await import('../provider.js')
    const { payload } = buildSignedNotification()
    payload.SignatureVersion = '99'
    expect(await verifySignature({}, JSON.stringify(payload))).toBe(false)
  })

  it('rejects payloads missing required SNS fields', async () => {
    installFetchMock(() => okCertResponse())
    const { verifySignature } = await import('../provider.js')
    expect(await verifySignature({}, JSON.stringify({ Type: 'Notification' }))).toBe(false)
  })

  it('verifies SubscriptionConfirmation payloads using the SC field order', async () => {
    installFetchMock(() => okCertResponse())
    const { verifySignature } = await import('../provider.js')
    const { body } = buildSignedNotification({
      Type: 'SubscriptionConfirmation',
      Token: 'tok-1',
      SubscribeURL: 'https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription',
    })
    expect(await verifySignature({}, body)).toBe(true)
  })

  it('honours AWS_SES_INBOUND_TOPIC_ARN topic-pinning', async () => {
    process.env.AWS_SES_INBOUND_TOPIC_ARN = 'arn:aws:sns:us-east-1:999:wrong'
    installFetchMock(() => okCertResponse())
    const { verifySignature } = await import('../provider.js')
    const { body } = buildSignedNotification()
    expect(await verifySignature({}, body)).toBe(false)
  })

  it('caches fetched certs across calls', async () => {
    const fetchSpy = vi.fn(() => okCertResponse())
    vi.stubGlobal('fetch', fetchSpy)
    const { verifySignature } = await import('../provider.js')
    const { body: body1 } = buildSignedNotification({ Subject: 's1' })
    const { body: body2 } = buildSignedNotification({ Subject: 's2' })
    expect(await verifySignature({}, body1)).toBe(true)
    expect(await verifySignature({}, body2)).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})

describe('parseWebhookPayload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('parses an SES Notification with raw RFC 822 content', async () => {
    const { parseWebhookPayload } = await import('../provider.js')

    const raw = [
      'From: Alice <alice@example.com>',
      'To: support@helpdesk.example',
      'Subject: Help me please',
      'Message-ID: <abc-123@mail.example.com>',
      'Date: Mon, 01 Jan 2024 00:00:00 +0000',
      'Content-Type: text/plain; charset=utf-8',
      '',
      'My printer is on fire.',
      '',
    ].join('\r\n')

    const sesMessage = {
      notificationType: 'Received',
      mail: {
        timestamp: '2024-01-01T00:00:00Z',
        source: 'alice@example.com',
        messageId: 'ses-amzn-1',
        destination: ['support@helpdesk.example'],
      },
      content: Buffer.from(raw, 'utf8').toString('base64'),
    }

    const sns = {
      Type: 'Notification',
      MessageId: 'sns-1',
      TopicArn: 'arn',
      Message: JSON.stringify(sesMessage),
      Timestamp: '2024-01-01T00:00:00Z',
      SignatureVersion: '1',
      Signature: 'x',
      SigningCertURL: ALLOWED_CERT_URL,
    }

    const email = await parseWebhookPayload({}, JSON.stringify(sns))

    expect(email.id).toBe('ses-amzn-1')
    expect(email.from).toContain('alice@example.com')
    expect(email.to).toEqual(['support@helpdesk.example'])
    expect(email.subject).toBe('Help me please')
    expect(email.textBody?.trim()).toBe('My printer is on fire.')
    expect(email.messageId).toBe('abc-123@mail.example.com')
    expect(email.receivedAt).toEqual(new Date('2024-01-01T00:00:00Z'))
  })

  it('synthesizes an InboundEmail from common headers when content is absent', async () => {
    const { parseWebhookPayload } = await import('../provider.js')

    const sesMessage = {
      notificationType: 'Received',
      mail: {
        timestamp: '2024-02-02T03:04:05Z',
        source: 'alice@example.com',
        messageId: 'ses-only',
        destination: ['support@helpdesk.example'],
        commonHeaders: {
          from: ['Alice <alice@example.com>'],
          to: ['support@helpdesk.example'],
          cc: ['mgr@example.com'],
          subject: 'Header-only',
          messageId: '<m-1@x>',
          inReplyTo: '<orig-1@x>',
          references: '<orig-1@x> <orig-0@x>',
        },
        headers: [
          { name: 'X-SES-Spam-Verdict', value: 'PASS' },
          { name: 'X-Custom', value: 'one' },
          { name: 'X-Custom', value: 'two' },
        ],
      },
    }

    const sns = {
      Type: 'Notification',
      MessageId: 'sns-2',
      TopicArn: 'arn',
      Message: JSON.stringify(sesMessage),
      Timestamp: '2024-02-02T03:04:05Z',
      SignatureVersion: '1',
      Signature: 'x',
      SigningCertURL: ALLOWED_CERT_URL,
    }

    const email = await parseWebhookPayload({}, JSON.stringify(sns))

    expect(email.id).toBe('ses-only')
    expect(email.from).toBe('Alice <alice@example.com>')
    expect(email.to).toEqual(['support@helpdesk.example'])
    expect(email.cc).toEqual(['mgr@example.com'])
    expect(email.subject).toBe('Header-only')
    expect(email.messageId).toBe('m-1@x')
    expect(email.inReplyTo).toBe('orig-1@x')
    expect(email.references).toEqual(['orig-1@x', 'orig-0@x'])
    expect(email.headers['x-ses-spam-verdict']).toBe('PASS')
    expect(email.headers['x-custom']).toEqual(['one', 'two'])
  })

  it('returns a synthetic InboundEmail for SubscriptionConfirmation messages', async () => {
    const { parseWebhookPayload } = await import('../provider.js')
    const sns = {
      Type: 'SubscriptionConfirmation',
      MessageId: 'sns-sc',
      TopicArn: 'arn',
      Token: 'tok',
      Message: 'You have chosen to subscribe...',
      SubscribeURL: 'https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription',
      Timestamp: '2024-01-01T00:00:00Z',
      SignatureVersion: '1',
      Signature: 'x',
      SigningCertURL: ALLOWED_CERT_URL,
    }
    const email = await parseWebhookPayload({}, JSON.stringify(sns))
    expect(email.subject).toBe('__sns:SubscriptionConfirmation')
    expect(email.id).toBe('sns-sc')
    expect(email.headers['x-sns-subscribe-url']).toBe(
      'https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription',
    )
  })

  it('throws when the body is not JSON', async () => {
    const { parseWebhookPayload } = await import('../provider.js')
    await expect(parseWebhookPayload({}, 'not json')).rejects.toThrow(/not valid JSON/u)
  })

  it('throws when the body is JSON but not an SNS payload', async () => {
    const { parseWebhookPayload } = await import('../provider.js')
    await expect(parseWebhookPayload({}, JSON.stringify({ foo: 'bar' }))).rejects.toThrow(
      /not an SNS notification/u,
    )
  })

  it('throws when the SNS Message is not valid JSON', async () => {
    const { parseWebhookPayload } = await import('../provider.js')
    const sns = {
      Type: 'Notification',
      MessageId: 'sns-bad',
      TopicArn: 'arn',
      Message: 'not-json',
      Timestamp: '2024-01-01T00:00:00Z',
      SignatureVersion: '1',
      Signature: 'x',
      SigningCertURL: ALLOWED_CERT_URL,
    }
    await expect(parseWebhookPayload({}, JSON.stringify(sns))).rejects.toThrow(/not valid JSON/u)
  })

  it('accepts already-parsed object bodies', async () => {
    const { parseWebhookPayload } = await import('../provider.js')

    const raw = [
      'From: pre@parsed.example',
      'To: ops@helpdesk.example',
      'Subject: parsed-object',
      'Message-ID: <obj-1@x>',
      'Date: Mon, 01 Jan 2024 00:00:00 +0000',
      'Content-Type: text/plain; charset=utf-8',
      '',
      'preparsed body',
      '',
    ].join('\r\n')

    const email = await parseWebhookPayload(
      {},
      {
        Type: 'Notification',
        MessageId: 'sns-obj',
        TopicArn: 'arn',
        Message: JSON.stringify({
          notificationType: 'Received',
          mail: {
            timestamp: '2024-01-01T00:00:00Z',
            source: 'pre@parsed.example',
            messageId: 'ses-obj',
            destination: ['ops@helpdesk.example'],
          },
          content: Buffer.from(raw, 'utf8').toString('base64'),
        }),
        Timestamp: '2024-01-01T00:00:00Z',
        SignatureVersion: '1',
        Signature: 'x',
        SigningCertURL: ALLOWED_CERT_URL,
      },
    )
    expect(email.from).toContain('pre@parsed.example')
    expect(email.subject).toBe('parsed-object')
    expect(email.textBody?.trim()).toBe('preparsed body')
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

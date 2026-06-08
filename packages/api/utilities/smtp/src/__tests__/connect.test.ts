import { describe, expect, it, vi } from 'vitest'

import { buildTransportOptions, connectSmtp } from '../connect.js'
import { type SmtpConfig, SmtpError } from '../types.js'

/**
 * Build a minimal fake nodemailer-like transporter. The real
 * `Transporter` interface is generic over many transports; for the
 * unit tests we only ever exercise `verify`, `sendMail`, and `close`.
 */
function buildFakeTransport(
  overrides: {
    verify?: () => Promise<true> | Promise<never>
    sendMail?: (options: unknown) => Promise<unknown>
    close?: () => void
  } = {},
): {
  transport: {
    verify: () => Promise<true>
    sendMail: (options: unknown) => Promise<unknown>
    close: () => void
  }
  calls: { sendMail: unknown[]; close: number; verify: number }
} {
  const calls = { sendMail: [] as unknown[], close: 0, verify: 0 }
  const transport = {
    verify: vi.fn(async () => {
      calls.verify += 1
      if (overrides.verify) return overrides.verify()
      return true as const
    }),
    sendMail: vi.fn(async (options: unknown) => {
      calls.sendMail.push(options)
      if (overrides.sendMail) return overrides.sendMail(options)
      return {
        messageId: '<abc@test>',
        accepted: ['friend@example.com'],
        rejected: [],
        response: '250 OK',
      }
    }),
    close: vi.fn(() => {
      calls.close += 1
      overrides.close?.()
    }),
  }
  return { transport, calls }
}

const baseConfig: SmtpConfig = {
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  auth: { user: 'me@example.com', pass: 'app-password' },
}

describe('buildTransportOptions', () => {
  it('maps password auth onto nodemailer options with timeouts', () => {
    const options = buildTransportOptions(baseConfig)
    expect(options.host).toBe('smtp.example.com')
    expect(options.port).toBe(587)
    expect(options.secure).toBe(false)
    expect(options.requireTLS).toBe(false)
    expect(options.connectionTimeout).toBe(30_000)
    expect(options.socketTimeout).toBe(30_000)
    expect(options.greetingTimeout).toBe(30_000)
    expect(options.auth).toEqual({ user: 'me@example.com', pass: 'app-password' })
  })

  it('maps OAuth2 access tokens to OAuth2 auth shape', () => {
    const options = buildTransportOptions({
      ...baseConfig,
      auth: { user: 'me@gmail.com', accessToken: 'ya29.token' },
    })
    expect(options.auth).toEqual({
      type: 'OAuth2',
      user: 'me@gmail.com',
      accessToken: 'ya29.token',
    })
  })

  it('omits auth entirely when caller passes null', () => {
    const options = buildTransportOptions({ ...baseConfig, auth: null })
    expect(options.auth).toBeUndefined()
  })

  it('honours requireTLS and custom timeouts', () => {
    const options = buildTransportOptions({
      ...baseConfig,
      secure: true,
      requireTLS: true,
      connectionTimeoutMs: 5_000,
      socketTimeoutMs: 10_000,
      greetingTimeoutMs: 1_000,
    })
    expect(options.secure).toBe(true)
    expect(options.requireTLS).toBe(true)
    expect(options.connectionTimeout).toBe(5_000)
    expect(options.socketTimeout).toBe(10_000)
    expect(options.greetingTimeout).toBe(1_000)
  })
})

describe('connectSmtp — config validation', () => {
  it('rejects a missing host', async () => {
    await expect(connectSmtp({ ...baseConfig, host: '' } as SmtpConfig)).rejects.toMatchObject({
      code: 'invalid-config',
    })
  })

  it('rejects a non-numeric port', async () => {
    await expect(connectSmtp({ ...baseConfig, port: 0 } as SmtpConfig)).rejects.toMatchObject({
      code: 'invalid-config',
    })
  })

  it('rejects auth without pass or accessToken', async () => {
    await expect(
      connectSmtp({
        ...baseConfig,
        auth: { user: 'me@example.com' } as unknown as SmtpConfig['auth'],
      }),
    ).rejects.toMatchObject({ code: 'invalid-config' })
  })

  it('accepts auth: null for unauthenticated relays', async () => {
    const { transport } = buildFakeTransport()
    const client = await connectSmtp(
      { ...baseConfig, auth: null },
      { createTransport: () => transport },
    )
    expect(client).toBeDefined()
  })
})

describe('connectSmtp — verify()', () => {
  it('resolves when nodemailer verify succeeds', async () => {
    const { transport, calls } = buildFakeTransport()
    const client = await connectSmtp(baseConfig, { createTransport: () => transport })
    await expect(client.verify()).resolves.toBeUndefined()
    expect(calls.verify).toBe(1)
  })

  it('translates EAUTH into auth-failed', async () => {
    const { transport } = buildFakeTransport({
      verify: async () => {
        const err = new Error('Invalid login') as Error & { code: string; responseCode: number }
        err.code = 'EAUTH'
        err.responseCode = 535
        throw err
      },
    })
    const client = await connectSmtp(baseConfig, { createTransport: () => transport })
    await expect(client.verify()).rejects.toBeInstanceOf(SmtpError)
    await expect(client.verify()).rejects.toMatchObject({ code: 'auth-failed', responseCode: 535 })
  })

  it('translates ECONNECTION into connection-failed', async () => {
    const { transport } = buildFakeTransport({
      verify: async () => {
        const err = new Error('connect ECONNREFUSED 1.2.3.4:587') as Error & { code: string }
        err.code = 'ECONNECTION'
        throw err
      },
    })
    const client = await connectSmtp(baseConfig, { createTransport: () => transport })
    await expect(client.verify()).rejects.toMatchObject({ code: 'connection-failed' })
  })

  it('translates ETIMEDOUT into timeout', async () => {
    const { transport } = buildFakeTransport({
      verify: async () => {
        const err = new Error('greeting timed out') as Error & { code: string }
        err.code = 'ETIMEDOUT'
        throw err
      },
    })
    const client = await connectSmtp(baseConfig, { createTransport: () => transport })
    await expect(client.verify()).rejects.toMatchObject({ code: 'timeout' })
  })

  it('translates STARTTLS messages into tls-required', async () => {
    const { transport } = buildFakeTransport({
      verify: async () => {
        throw new Error('STARTTLS is required')
      },
    })
    const client = await connectSmtp(baseConfig, { createTransport: () => transport })
    await expect(client.verify()).rejects.toMatchObject({ code: 'tls-required' })
  })
})

describe('connectSmtp — sendMail()', () => {
  it('forwards the normalized message and returns a SendResult', async () => {
    const { transport, calls } = buildFakeTransport({
      sendMail: async () => ({
        messageId: '<id-1@test>',
        accepted: ['a@example.com', { address: 'b@example.com' }],
        rejected: [{ address: 'c@example.com' }],
        response: '250 2.0.0 OK',
      }),
    })
    const client = await connectSmtp(baseConfig, { createTransport: () => transport })

    const result = await client.sendMail({
      from: 'me@example.com',
      to: ['a@example.com', 'b@example.com'],
      cc: 'cc@example.com',
      bcc: 'bcc@example.com',
      subject: 'hello',
      text: 'plain',
      html: '<b>html</b>',
      replyTo: 'reply@example.com',
      attachments: [{ filename: 'note.txt', content: 'inline' }],
      headers: { 'X-Test': 'yes' },
    })

    expect(result.messageId).toBe('<id-1@test>')
    expect(result.accepted).toEqual(['a@example.com', 'b@example.com'])
    expect(result.rejected).toEqual(['c@example.com'])
    expect(result.response).toBe('250 2.0.0 OK')

    expect(calls.sendMail).toHaveLength(1)
    const payload = calls.sendMail[0] as Record<string, unknown>
    expect(payload.from).toBe('me@example.com')
    expect(payload.to).toEqual(['a@example.com', 'b@example.com'])
    expect(payload.cc).toBe('cc@example.com')
    expect(payload.bcc).toBe('bcc@example.com')
    expect(payload.subject).toBe('hello')
    expect(payload.text).toBe('plain')
    expect(payload.html).toBe('<b>html</b>')
    expect(payload.replyTo).toBe('reply@example.com')
    expect(payload.attachments).toEqual([{ filename: 'note.txt', content: 'inline' }])
    expect(payload.headers).toEqual({ 'X-Test': 'yes' })
  })

  it('translates send-time auth failures into auth-failed', async () => {
    const { transport } = buildFakeTransport({
      sendMail: async () => {
        const err = new Error('535 Authentication failed') as Error & {
          code: string
          responseCode: number
        }
        err.code = 'EAUTH'
        err.responseCode = 535
        throw err
      },
    })
    const client = await connectSmtp(baseConfig, { createTransport: () => transport })
    await expect(
      client.sendMail({
        from: 'me@example.com',
        to: 'friend@example.com',
        subject: 's',
        text: 'b',
      }),
    ).rejects.toMatchObject({ code: 'auth-failed', responseCode: 535 })
  })

  it('falls back to send-failed for unknown errors', async () => {
    const { transport } = buildFakeTransport({
      sendMail: async () => {
        throw new Error('nope')
      },
    })
    const client = await connectSmtp(baseConfig, { createTransport: () => transport })
    await expect(
      client.sendMail({
        from: 'me@example.com',
        to: 'friend@example.com',
        subject: 's',
        text: 'b',
      }),
    ).rejects.toMatchObject({ code: 'send-failed' })
  })

  it('handles empty accepted/rejected/messageId/response from upstream', async () => {
    const { transport } = buildFakeTransport({
      sendMail: async () => ({}),
    })
    const client = await connectSmtp(baseConfig, { createTransport: () => transport })
    const result = await client.sendMail({
      from: 'me@example.com',
      to: 'friend@example.com',
      subject: 's',
      text: 'b',
    })
    expect(result).toEqual({ messageId: '', accepted: [], rejected: [], response: '' })
  })
})

describe('connectSmtp — disconnect()', () => {
  it('calls close on the underlying transport', async () => {
    const { transport, calls } = buildFakeTransport()
    const client = await connectSmtp(baseConfig, { createTransport: () => transport })
    await client.disconnect()
    expect(calls.close).toBe(1)
  })

  it('is safe when the transport has no close method', async () => {
    const transport = {
      verify: vi.fn(async () => true as const),
      sendMail: vi.fn(async () => ({})),
    }
    const client = await connectSmtp(baseConfig, {
      createTransport: () =>
        transport as unknown as Parameters<
          NonNullable<Parameters<typeof connectSmtp>[1]['createTransport']>
        >[0] extends infer _
          ? ReturnType<NonNullable<Parameters<typeof connectSmtp>[1]['createTransport']>>
          : never,
    })
    await expect(client.disconnect()).resolves.toBeUndefined()
  })
})

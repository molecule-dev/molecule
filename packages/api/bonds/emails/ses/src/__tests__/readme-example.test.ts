/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. The real AWS SDK SESv2 client and
 * nodemailer run; the SES API itself is replaced by a local HTTP server via
 * `AWS_SES_ENDPOINT` (read on the first send).
 *
 * @module
 */
import { Buffer } from 'node:buffer'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { sendMail, setTransport } from '@molecule/api-emails'

import { provider as ses } from '../index.js'

describe('README @example', () => {
  const originalEnv = process.env
  const requests: Array<{ url: string; auth: string | undefined; body: Record<string, unknown> }> =
    []
  let api: Server

  beforeAll(async () => {
    api = createServer((req, res) => {
      let data = ''
      req.on('data', (chunk: Buffer) => (data += chunk.toString()))
      req.on('end', () => {
        requests.push({
          url: req.url ?? '',
          auth: req.headers.authorization,
          body: JSON.parse(data) as Record<string, unknown>,
        })
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ MessageId: '0100019-readme-example' }))
      })
    })
    await new Promise<void>((resolve) => api.listen(0, '127.0.0.1', () => resolve()))
    const { port } = api.address() as AddressInfo
    process.env = {
      ...originalEnv,
      AWS_SES_REGION: 'eu-west-1',
      AWS_SES_ENDPOINT: `http://127.0.0.1:${port}`,
      AWS_ACCESS_KEY_ID: 'AKIAREADMEEXAMPLE',
      AWS_SECRET_ACCESS_KEY: 'readme-example-secret',
      NO_PROXY: '127.0.0.1,localhost',
      no_proxy: '127.0.0.1,localhost',
    }
  })

  afterAll(async () => {
    process.env = originalEnv
    await new Promise<void>((resolve) => api.close(() => resolve()))
  })

  it('sends raw MIME through SESv2 SendEmail, signed for the configured region', async () => {
    setTransport(ses)

    const result = await sendMail({
      from: 'Acme <no-reply@acme.example>',
      to: 'ada@example.com',
      subject: 'Welcome to Acme',
      text: 'Thanks for signing up!',
      html: '<p>Thanks for signing up!</p>',
    })

    expect(result.accepted).toEqual(['ada@example.com'])
    expect(result.rejected).toEqual([])
    expect(result.messageId).toBe('<0100019-readme-example@eu-west-1.amazonses.com>')

    expect(requests).toHaveLength(1)
    expect(requests[0]?.url).toBe('/v2/email/outbound-emails')
    expect(requests[0]?.auth).toContain('Credential=AKIAREADMEEXAMPLE/')
    expect(requests[0]?.auth).toContain('/eu-west-1/ses/aws4_request')
    const content = requests[0]?.body.Content as { Raw: { Data: string } }
    const mime = Buffer.from(content.Raw.Data, 'base64').toString('utf8')
    expect(mime).toContain('To: ada@example.com')
    expect(mime).toContain('Subject: Welcome to Acme')
  })
})

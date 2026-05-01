/**
 * Unit tests for the SES inbound provider's parsing utilities.
 */

import { Buffer } from 'node:buffer'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  base64ToBuffer,
  bodyToString,
  buildSnsCanonicalString,
  getHeader,
  getSigningCertHostnameSuffixes,
  headerToString,
  isAllowedSigningCertUrl,
  parseJsonBody,
  parseRawMimeContent,
  splitReferences,
  unwrapMessageId,
} from '../utilities.js'

describe('headerToString', () => {
  it('passes through plain strings', () => {
    expect(headerToString('text/plain')).toBe('text/plain')
  })

  it('joins array values with `, `', () => {
    expect(headerToString(['a', 'b'])).toBe('a, b')
  })

  it('returns undefined for undefined input', () => {
    expect(headerToString(undefined)).toBeUndefined()
  })
})

describe('getHeader', () => {
  it('looks up headers case-insensitively', () => {
    expect(getHeader({ 'Content-Type': 'application/json' }, 'content-type')).toBe(
      'application/json',
    )
    expect(getHeader({ 'X-Amz-Sns-Message-Type': 'Notification' }, 'x-amz-sns-message-type')).toBe(
      'Notification',
    )
  })

  it('returns undefined when missing', () => {
    expect(getHeader({}, 'absent')).toBeUndefined()
  })
})

describe('bodyToString', () => {
  it('decodes Buffer as UTF-8', () => {
    expect(bodyToString(Buffer.from('héllo', 'utf8'))).toBe('héllo')
  })

  it('returns plain strings as-is', () => {
    expect(bodyToString('plain')).toBe('plain')
  })
})

describe('parseJsonBody', () => {
  it('parses JSON strings', () => {
    expect(parseJsonBody('{"a":1}')).toEqual({ a: 1 })
  })

  it('parses Buffer bodies', () => {
    expect(parseJsonBody(Buffer.from('{"a":2}', 'utf8'))).toEqual({ a: 2 })
  })

  it('passes objects through', () => {
    expect(parseJsonBody({ a: 3 })).toEqual({ a: 3 })
  })

  it('throws on malformed JSON', () => {
    expect(() => parseJsonBody('not json')).toThrow()
  })
})

describe('isAllowedSigningCertUrl', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('accepts canonical sns.us-east-1.amazonaws.com URLs', () => {
    expect(
      isAllowedSigningCertUrl(
        'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-abcd.pem',
      ),
    ).toBe(true)
  })

  it('rejects http (non-TLS) URLs', () => {
    expect(
      isAllowedSigningCertUrl('http://sns.us-east-1.amazonaws.com/SimpleNotificationService.pem'),
    ).toBe(false)
  })

  it('rejects URLs whose hostname is not under the allowlist', () => {
    expect(isAllowedSigningCertUrl('https://attacker.example/cert.pem')).toBe(false)
    expect(isAllowedSigningCertUrl('https://sns.amazonaws.com.attacker.example/x')).toBe(false)
  })

  it('rejects malformed URLs', () => {
    expect(isAllowedSigningCertUrl('not-a-url')).toBe(false)
  })

  it('honours AWS_SNS_SIGNING_CERT_HOSTNAME_SUFFIXES override', () => {
    process.env.AWS_SNS_SIGNING_CERT_HOSTNAME_SUFFIXES = '.example.test'
    expect(isAllowedSigningCertUrl('https://sns.example.test/cert.pem')).toBe(true)
    expect(isAllowedSigningCertUrl('https://sns.us-east-1.amazonaws.com/cert.pem')).toBe(false)
  })

  it('falls back to the default allowlist when override is empty', () => {
    process.env.AWS_SNS_SIGNING_CERT_HOSTNAME_SUFFIXES = '   ,   '
    expect(getSigningCertHostnameSuffixes()).toEqual(['.amazonaws.com'])
  })
})

describe('buildSnsCanonicalString', () => {
  it('orders Notification fields per AWS spec', () => {
    const out = buildSnsCanonicalString({
      Type: 'Notification',
      MessageId: 'm1',
      Message: 'hello',
      Subject: 'subj',
      Timestamp: '2024-01-01T00:00:00Z',
      TopicArn: 'arn:aws:sns:us-east-1:1:t',
    })
    expect(out).toBe(
      [
        'Message',
        'hello',
        'MessageId',
        'm1',
        'Subject',
        'subj',
        'Timestamp',
        '2024-01-01T00:00:00Z',
        'TopicArn',
        'arn:aws:sns:us-east-1:1:t',
        'Type',
        'Notification',
        '',
      ].join('\n'),
    )
  })

  it('omits Subject when absent', () => {
    const out = buildSnsCanonicalString({
      Type: 'Notification',
      MessageId: 'm',
      Message: 'msg',
      Timestamp: '2024',
      TopicArn: 'arn',
    })
    expect(out).not.toContain('Subject')
    expect(out.startsWith('Message\nmsg\n')).toBe(true)
  })

  it('uses the SubscriptionConfirmation field order when Type is SubscriptionConfirmation', () => {
    const out = buildSnsCanonicalString({
      Type: 'SubscriptionConfirmation',
      MessageId: 'm',
      Message: 'msg',
      SubscribeURL: 'https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription',
      Timestamp: '2024',
      Token: 'tok',
      TopicArn: 'arn',
    })
    const lines = out.split('\n')
    // Field labels appear in this order:
    expect(lines[0]).toBe('Message')
    expect(lines[2]).toBe('MessageId')
    expect(lines[4]).toBe('SubscribeURL')
    expect(lines[6]).toBe('Timestamp')
    expect(lines[8]).toBe('Token')
    expect(lines[10]).toBe('TopicArn')
    expect(lines[12]).toBe('Type')
  })
})

describe('splitReferences', () => {
  it('splits whitespace-separated message-ids', () => {
    expect(splitReferences('<a@x> <b@x>\n<c@x>')).toEqual(['<a@x>', '<b@x>', '<c@x>'])
  })

  it('returns empty array for missing input', () => {
    expect(splitReferences(undefined)).toEqual([])
    expect(splitReferences('')).toEqual([])
  })
})

describe('unwrapMessageId', () => {
  it('strips angle brackets', () => {
    expect(unwrapMessageId('<abc@x>')).toBe('abc@x')
  })

  it('passes plain message-ids through', () => {
    expect(unwrapMessageId('abc@x')).toBe('abc@x')
  })

  it('returns undefined for empty / missing input', () => {
    expect(unwrapMessageId(undefined)).toBeUndefined()
    expect(unwrapMessageId('')).toBeUndefined()
    expect(unwrapMessageId('   ')).toBeUndefined()
  })
})

describe('base64ToBuffer', () => {
  it('decodes base64 strings', () => {
    expect(base64ToBuffer(Buffer.from('hello', 'utf8').toString('base64')).toString('utf8')).toBe(
      'hello',
    )
  })
})

describe('parseRawMimeContent', () => {
  it('parses a minimal RFC 822 message', async () => {
    const raw = [
      'From: Alice <alice@example.com>',
      'To: support@helpdesk.example',
      'Subject: Help me',
      'Message-ID: <abc-123@mail.example.com>',
      'Date: Mon, 01 Jan 2024 00:00:00 +0000',
      'Content-Type: text/plain; charset=utf-8',
      '',
      'My printer is on fire.',
      '',
    ].join('\r\n')

    const email = await parseRawMimeContent(raw)
    expect(email.from).toContain('alice@example.com')
    expect(email.to).toEqual(['support@helpdesk.example'])
    expect(email.subject).toBe('Help me')
    expect(email.textBody?.trim()).toBe('My printer is on fire.')
    expect(email.messageId).toBe('abc-123@mail.example.com')
    expect(email.id).toBe('abc-123@mail.example.com')
    expect(email.headers['from']).toBeDefined()
  })

  it('extracts inReplyTo, references and cc', async () => {
    const raw = [
      'From: bob@example.com',
      'To: support@helpdesk.example',
      'Cc: mgr@example.com, ops@helpdesk.example',
      'Subject: Re: Ticket',
      'Message-ID: <reply-1@mail.example.com>',
      'In-Reply-To: <orig-1@mail.example.com>',
      'References: <orig-1@mail.example.com> <orig-0@mail.example.com>',
      'Date: Mon, 01 Jan 2024 00:00:00 +0000',
      'Content-Type: text/plain; charset=utf-8',
      '',
      'follow-up',
      '',
    ].join('\r\n')

    const email = await parseRawMimeContent(raw)
    expect(email.cc).toEqual(['mgr@example.com', 'ops@helpdesk.example'])
    expect(email.inReplyTo).toBe('orig-1@mail.example.com')
    expect(email.references).toEqual(['orig-1@mail.example.com', 'orig-0@mail.example.com'])
  })

  it('decodes attachments to base64', async () => {
    const boundary = 'BOUNDARY-XYZ'
    const attachmentB64 = Buffer.from('hello-attach', 'utf8').toString('base64')
    const raw = [
      'From: alice@example.com',
      'To: support@helpdesk.example',
      'Subject: with attach',
      'Message-ID: <m-1@x>',
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      'body text',
      '',
      `--${boundary}`,
      'Content-Type: text/plain; name="note.txt"',
      'Content-Disposition: attachment; filename="note.txt"',
      'Content-Transfer-Encoding: base64',
      '',
      attachmentB64,
      '',
      `--${boundary}--`,
      '',
    ].join('\r\n')

    const email = await parseRawMimeContent(raw)
    expect(email.attachments).toBeDefined()
    expect(email.attachments).toHaveLength(1)
    expect(email.attachments?.[0]?.name).toBe('note.txt')
    expect(
      Buffer.from(email.attachments?.[0]?.contentBase64 ?? '', 'base64').toString('utf8'),
    ).toBe('hello-attach')
  })

  it('applies overrides', async () => {
    const raw = [
      'From: a@x',
      'To: b@y',
      'Subject: s',
      'Message-ID: <m@x>',
      'Date: Mon, 01 Jan 2024 00:00:00 +0000',
      '',
      '',
    ].join('\r\n')
    const overrideDate = new Date('2026-01-01T00:00:00Z')
    const email = await parseRawMimeContent(raw, { id: 'override-id', receivedAt: overrideDate })
    expect(email.id).toBe('override-id')
    expect(email.receivedAt).toEqual(overrideDate)
  })
})

/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual nodemailer.
 *
 * The unit suite (`sendmail.test.ts`) mocks nodemailer, so it can only validate
 * OUR assumptions about nodemailer — not nodemailer. That gap shipped a real
 * consumer-experience bug: the mocked transport returned `accepted` arrays that
 * the REAL sendmail transport never produces (it resolves with
 * `{ envelope, messageId, response }` only — the `accepted` field in
 * `@types/nodemailer` is type-level drift), so every successful send reported
 * `accepted: []` and a caller gating on "was my recipient accepted?" concluded
 * delivery failed. These tests run the real MIME pipeline into a stub sendmail
 * binary (`SENDMAIL_PATH`) and pin both the mapping and the distinct failure
 * modes a caller needs to tell apart.
 *
 * @module
 */

import { Buffer } from 'node:buffer'
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { EmailMessage, EmailSendResult } from '@molecule/api-emails'

/** Scratch dir holding the stub binaries + captured output. */
const dir = mkdtempSync(join(tmpdir(), 'sendmail-bond-test-'))

/** Stub sendmail: records argv and the raw MIME piped to stdin, exits 0. */
const okStubPath = join(dir, 'sendmail-ok')
writeFileSync(
  okStubPath,
  '#!/bin/sh\n' +
    '# Test stand-in for /usr/sbin/sendmail — capture argv + stdin.\n' +
    'printf \'%s\\n\' "$@" > "$SENDMAIL_STUB_OUT.args"\n' +
    'cat > "$SENDMAIL_STUB_OUT.eml"\n',
)
chmodSync(okStubPath, 0o755)

/** Stub sendmail that consumes stdin but fails (like a broken local MTA). */
const failStubPath = join(dir, 'sendmail-fail')
writeFileSync(failStubPath, '#!/bin/sh\ncat > /dev/null\nexit 1\n')
chmodSync(failStubPath, 0o755)

afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
})

/**
 * Imports a fresh copy of the provider with `SENDMAIL_PATH` pointing at the
 * given binary (the transport reads the path once at module load).
 *
 * @param binaryPath - Path to the (stub) sendmail binary.
 * @returns The bond's `sendMail` function.
 */
const importProviderWithBinary = async (
  binaryPath: string,
): Promise<(message: EmailMessage) => Promise<EmailSendResult>> => {
  vi.resetModules()
  process.env.SENDMAIL_PATH = binaryPath
  const { sendMail } = await import('../sendMail.js')
  return sendMail
}

describe('@molecule/api-emails-sendmail × REAL nodemailer', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  it('CONSUMER PROPERTY: a realistic message round-trips and the caller sees its recipients accepted', async () => {
    const sendMail = await importProviderWithBinary(okStubPath)
    const out = join(dir, 'lifecycle')
    process.env.SENDMAIL_STUB_OUT = out

    const attachmentBody = 'id,total\n1,42\n'
    const result = await sendMail({
      from: { name: 'Märchen App', address: 'no-reply@example.com' },
      to: ['alice@example.com', { name: 'Bob', address: 'bob@example.com' }],
      subject: 'Bienvenue à bord 🚀',
      text: 'Welcome aboard!',
      html: '<p>Welcome aboard!</p>',
      attachments: [
        { filename: 'report.csv', content: Buffer.from(attachmentBody), contentType: 'text/csv' },
      ],
    })

    // The regression this pins: the real transport returns no `accepted`
    // field, so the bond must report the envelope recipients — `[]` here made
    // consumers conclude every successful send had failed.
    expect(result.accepted).toEqual(['alice@example.com', 'bob@example.com'])
    expect(result.rejected).toEqual([])
    expect(result.messageId).toMatch(/^<.+@.+>$/u)
    expect(result.response).toBe('Messages queued for delivery')

    // The binary really received the envelope on argv (-i -f sender rcpt...).
    const args = readFileSync(`${out}.args`, 'utf8').trim().split('\n')
    expect(args).toContain('-i')
    expect(args).toContain('-f')
    expect(args).toContain('no-reply@example.com')
    expect(args).toContain('alice@example.com')
    expect(args).toContain('bob@example.com')

    // ...and a real MIME message on stdin: RFC 2047-encoded UTF-8 subject,
    // multipart body, base64 attachment payload intact.
    const mime = readFileSync(`${out}.eml`, 'utf8')
    expect(mime).toMatch(/^Subject: =\?UTF-8\?/mu)
    expect(mime).toMatch(/^Content-Type: multipart\/mixed;/mu)
    expect(mime).toContain('Welcome aboard!')
    expect(mime).toContain('<p>Welcome aboard!</p>')
    expect(mime).toContain('report.csv')
    expect(mime).toContain(Buffer.from(attachmentBody).toString('base64'))
  })

  it('FAILURE DISAMBIGUATION: a missing binary fails with ENOENT naming the path (install/configure SENDMAIL_PATH)', async () => {
    const missingPath = join(dir, 'no-such-sendmail')
    const sendMail = await importProviderWithBinary(missingPath)

    let caught: unknown
    await sendMail({ from: 'a@x.example', to: 'b@y.example', subject: 'S', text: 'hi' }).catch(
      (e: unknown) => {
        caught = e
      },
    )
    expect((caught as { code?: string }).code).toBe('ENOENT')
    expect((caught as Error).message).toContain(missingPath)
  })

  it('FAILURE DISAMBIGUATION: a binary that exits non-zero fails with the exit code, not ENOENT', async () => {
    const sendMail = await importProviderWithBinary(failStubPath)

    await expect(
      sendMail({ from: 'a@x.example', to: 'b@y.example', subject: 'S', text: 'hi' }),
    ).rejects.toThrow(/Sendmail exited with code 1/u)
  })

  it('FAILURE DISAMBIGUATION: envelope addresses starting with "-" are rejected up front (argument-injection guard)', async () => {
    // Use the missing binary path: getting the envelope error (not ENOENT)
    // proves nodemailer rejects BEFORE ever spawning anything.
    const sendMail = await importProviderWithBinary(join(dir, 'no-such-sendmail'))

    await expect(
      sendMail({ from: 'a@x.example', to: '-evil@example.com', subject: 'S', text: 'hi' }),
    ).rejects.toThrow(/Invalid envelope addresses/u)
    expect(existsSync(join(dir, 'no-such-sendmail'))).toBe(false)
  })
})

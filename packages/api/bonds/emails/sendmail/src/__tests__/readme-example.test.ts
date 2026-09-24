/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Real nodemailer builds the MIME
 * message; the local `sendmail` binary is a stub script (via `SENDMAIL_PATH`)
 * that captures what it was piped.
 *
 * @module
 */
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { sendMail, setTransport } from '@molecule/api-emails'

const dir = mkdtempSync(join(tmpdir(), 'sendmail-readme-'))
const stubPath = join(dir, 'sendmail')
const outPath = join(dir, 'captured')

describe('README @example', () => {
  const originalEnv = process.env

  beforeAll(() => {
    writeFileSync(
      stubPath,
      '#!/bin/sh\n' +
        '# Stand-in for /usr/sbin/sendmail: record argv + the piped message.\n' +
        `printf '%s\\n' "$@" > '${outPath}.args'\n` +
        `cat > '${outPath}.eml'\n`,
    )
    chmodSync(stubPath, 0o755)
    // The binary path is read at module load, so it is set before the import below.
    process.env = { ...originalEnv, SENDMAIL_PATH: stubPath }
  })

  afterAll(() => {
    process.env = originalEnv
    rmSync(dir, { recursive: true, force: true })
  })

  it('pipes the message to the sendmail binary and reports it queued', async () => {
    const { provider: sendmail } = await import('../index.js')

    setTransport(sendmail)

    const result = await sendMail({
      from: 'Acme <no-reply@acme.example>',
      to: 'ada@example.com',
      subject: 'Welcome to Acme',
      text: 'Thanks for signing up!',
    })

    expect(result.accepted).toEqual(['ada@example.com'])
    expect(result.rejected).toEqual([])
    expect(result.messageId).toMatch(/^<.+@acme\.example>$/)
    expect(result.response).toBe('Messages queued for delivery')

    const args = readFileSync(`${outPath}.args`, 'utf8')
    expect(args).toContain('ada@example.com')
    const eml = readFileSync(`${outPath}.eml`, 'utf8')
    expect(eml).toContain('Subject: Welcome to Acme')
    expect(eml).toContain('Thanks for signing up!')
  })
})

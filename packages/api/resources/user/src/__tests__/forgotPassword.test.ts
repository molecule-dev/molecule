/**
 * The password-reset email carries a link to the reset page, built from the site origin — and from
 * `APP_ORIGIN` when no separate `SITE_ORIGIN` is set (R140). The link used to depend on
 * `SITE_ORIGIN` alone, so a deployment that sets only `APP_ORIGIN` sent an email with the token
 * and no link at all.
 *
 * With no email provider bonded the reset email can never go out, so the handler says so (501)
 * for every address instead of answering "success" (2026-11-22 smoke test review).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGet, mockFindOne, mockUpdateById, mockGetConfig, mockSendMail } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockFindOne: vi.fn(),
  mockUpdateById: vi.fn(),
  mockGetConfig: vi.fn(),
  mockSendMail: vi.fn(),
}))

vi.mock('@molecule/api-bond', () => ({
  get: mockGet,
  getAnalytics: () => ({ track: () => ({ catch: () => undefined }) }),
  getLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }),
}))
vi.mock('@molecule/api-config', () => ({ get: mockGetConfig }))
vi.mock('@molecule/api-database', () => ({ findOne: mockFindOne, updateById: mockUpdateById }))
vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, values?: Record<string, unknown>) =>
    values ? `${key} ${JSON.stringify(values)}` : key,
}))

import { forgotPassword } from '../handlers/forgotPassword.js'

const handler = forgotPassword({ name: 'user', tableName: 'users', schema: {} } as never)

function config(values: Record<string, string>): void {
  mockGetConfig.mockImplementation((key: string, fallback?: string) => values[key] ?? fallback)
}

describe('forgotPassword email link', () => {
  beforeEach(() => {
    mockGet.mockReset().mockReturnValue({ sendMail: mockSendMail })
    mockSendMail.mockReset().mockResolvedValue(undefined)
    mockFindOne.mockReset().mockResolvedValue({ id: 'u1', email: 'ada+test@example.com' })
    mockUpdateById.mockReset().mockResolvedValue(undefined)
  })

  it('links to the reset page on APP_ORIGIN when SITE_ORIGIN is not set', async () => {
    config({ APP_ORIGIN: 'https://www.molecule.dev', EMAIL_FROM: 'no-reply@molecule.dev' })
    const result = await handler({ body: { email: 'Ada+test@example.com' } } as never)
    expect(result.statusCode).toBe(200)

    const mail = mockSendMail.mock.calls[0][0] as { text: string; html: string }
    expect(mail.text).toContain('https://www.molecule.dev/reset-password?token=')
    expect(mail.html).toContain('https://www.molecule.dev/reset-password?token=')
    // The reset page prefills the address from the link, URL-encoded.
    expect(mail.text).toContain('&email=ada%2Btest%40example.com')
  })

  it('prefers SITE_ORIGIN when both are set', async () => {
    config({ SITE_ORIGIN: 'https://site.example', APP_ORIGIN: 'https://app.example' })
    await handler({ body: { email: 'ada@example.com' } } as never)
    const mail = mockSendMail.mock.calls[0][0] as { text: string }
    expect(mail.text).toContain('https://site.example/reset-password?token=')
    expect(mail.text).not.toContain('app.example')
  })

  it('still sends the token, with no link, when neither origin is configured', async () => {
    config({})
    await handler({ body: { email: 'ada@example.com' } } as never)
    const mail = mockSendMail.mock.calls[0][0] as { text: string }
    expect(mail.text).toContain('user.email.passwordResetText')
    expect(mail.text).not.toContain('reset-password?token=')
  })
})

describe('forgotPassword with no email provider bonded', () => {
  beforeEach(() => {
    mockGet.mockReset().mockReturnValue(undefined)
    mockFindOne.mockReset()
    mockUpdateById.mockReset()
  })

  it.each(['ada@example.com', 'nobody@example.com'])(
    'answers 501 for %s, before any lookup, and stores no token',
    async (email) => {
      mockFindOne.mockResolvedValue(email === 'ada@example.com' ? { id: 'u1', email } : null)
      const result = await handler({ body: { email } } as never)
      expect(result).toEqual({
        statusCode: 501,
        body: {
          error: 'user.error.passwordResetUnavailable',
          errorKey: 'user.error.passwordResetUnavailable',
        },
      })
      // The same answer for a known and an unknown address: nothing about accounts is revealed.
      expect(mockFindOne).not.toHaveBeenCalled()
      expect(mockUpdateById).not.toHaveBeenCalled()
    },
  )

  it('still asks for the email first', async () => {
    const result = await handler({ body: {} } as never)
    expect(result.statusCode).toBe(400)
  })
})

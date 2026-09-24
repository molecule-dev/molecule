/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real capture transport and
 * console activity sink (nothing leaves the process, so nothing is mocked).
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setSink } from '@molecule/api-activity'
import { provider as consoleSink } from '@molecule/api-activity-console'
import { setTransport } from '@molecule/api-emails'
import { provider as captureOnly } from '@molecule/api-emails-capture'

import { sendTemplate, TEMPLATE_KEYS } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the built-in template and sends it through the bonded transport', async () => {
    const recorded = vi.spyOn(consoleSink, 'record')

    setSink(consoleSink)
    setTransport(captureOnly)

    const result = await sendTemplate(TEMPLATE_KEYS.subscriptionStarted, {
      from: 'billing@example.com',
      to: 'lou@example.com',
      locale: 'en',
      variables: {
        appName: 'Personal Finance',
        userName: 'Lou',
        planName: 'Pro',
        amount: '$19.00',
        period: 'month',
        manageUrl: 'https://app.example.com/billing',
      },
    })

    expect(result.accepted).toEqual(['lou@example.com'])
    expect(result.messageId).toMatch(/^captured-/)
    expect(recorded).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'email',
        status: 'captured',
        recipient: 'lou@example.com',
        summary: 'Welcome to Pro on Personal Finance',
        payload: expect.objectContaining({
          from: 'billing@example.com',
          text: expect.stringContaining('You will be billed $19.00 per month.'),
          html: expect.stringContaining('<a href="https://app.example.com/billing">'),
        }),
      }),
    )
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EmailMessage, EmailSendResult, EmailTransport } from '@molecule/api-emails'

const sendMailMock = vi.fn<(message: EmailMessage) => Promise<EmailSendResult>>()
const transportMock: EmailTransport = {
  sendMail: sendMailMock,
}

vi.mock('@molecule/api-emails', () => {
  return {
    getTransport: () => transportMock,
  }
})

vi.mock('@molecule/api-i18n', () => {
  return {
    t: vi.fn(
      (_key: string, values?: Record<string, unknown>, options?: { defaultValue?: string }) => {
        const template = options?.defaultValue ?? _key
        if (!values) return template
        return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => {
          const value = values[name]
          return value == null ? '' : String(value)
        })
      },
    ),
  }
})

let sendTemplate: typeof import('../send.js').sendTemplate
let registerTemplate: typeof import('../registry.js').registerTemplate
let clearRegistry: typeof import('../registry.js').clearRegistry

const sendResult: EmailSendResult = {
  accepted: ['user@example.com'],
  rejected: [],
  messageId: 'mid-1',
}

describe('sendTemplate', () => {
  beforeEach(async () => {
    vi.resetModules()
    const sendModule = await import('../send.js')
    const registryModule = await import('../registry.js')
    sendTemplate = sendModule.sendTemplate
    registerTemplate = registryModule.registerTemplate
    clearRegistry = registryModule.clearRegistry
    clearRegistry()
    sendMailMock.mockReset()
    sendMailMock.mockResolvedValue(sendResult)
  })

  it('renders the built-in subscription.started template and sends it', async () => {
    const result = await sendTemplate('subscription.started', {
      from: 'support@example.com',
      to: 'user@example.com',
      variables: {
        appName: 'Personal Finance',
        userName: 'Lou',
        planName: 'Pro',
        amount: '$19.00',
        period: 'month',
        manageUrl: 'https://app.example.com/billing',
      },
    })

    expect(result).toEqual(sendResult)
    expect(sendMailMock).toHaveBeenCalledTimes(1)
    const message = sendMailMock.mock.calls[0]?.[0]
    expect(message?.subject).toContain('Pro')
    expect(message?.subject).toContain('Personal Finance')
    expect(message?.text).toContain('Lou')
    expect(message?.text).toContain('$19.00')
    expect(message?.html).toContain('<strong>$19.00</strong>')
    expect(message?.from).toBe('support@example.com')
    expect(message?.to).toBe('user@example.com')
    expect(message?.subjectKey).toBe('emailTemplates.subscriptionStarted.subject')
    expect(message?.textKey).toBe('emailTemplates.subscriptionStarted.text')
    expect(message?.htmlKey).toBe('emailTemplates.subscriptionStarted.html')
  })

  it('throws for unknown template keys', async () => {
    await expect(sendTemplate('unknown.key', { from: 'a@x.com', to: 'b@x.com' })).rejects.toThrow(
      /no template/i,
    )
  })

  it('uses registered overrides instead of defaults', async () => {
    registerTemplate({
      key: 'subscription.started',
      subjectKey: 'overrides.subject',
      defaultSubject: 'Branded subject for {{userName}}',
      textKey: 'overrides.text',
      defaultText: 'Body',
    })

    await sendTemplate('subscription.started', {
      from: 'support@example.com',
      to: 'user@example.com',
      variables: { userName: 'Lou' },
    })

    const message = sendMailMock.mock.calls[0]?.[0]
    expect(message?.subject).toBe('Branded subject for Lou')
    expect(message?.html).toBeUndefined()
  })

  it('forwards cc, bcc, and replyTo when provided', async () => {
    await sendTemplate('subscription.started', {
      from: 'support@example.com',
      to: 'user@example.com',
      cc: 'audit@example.com',
      bcc: 'archive@example.com',
      replyTo: 'noreply@example.com',
      variables: {
        appName: 'X',
        userName: 'L',
        planName: 'Pro',
        amount: '$1',
        period: 'month',
        manageUrl: 'https://x',
      },
    })

    const message = sendMailMock.mock.calls[0]?.[0]
    expect(message?.cc).toBe('audit@example.com')
    expect(message?.bcc).toBe('archive@example.com')
    expect(message?.replyTo).toBe('noreply@example.com')
  })

  it('omits html when the registered template has no htmlKey', async () => {
    registerTemplate({
      key: 'app.text-only',
      subjectKey: 'app.text-only.subject',
      defaultSubject: 'S',
      textKey: 'app.text-only.text',
      defaultText: 'T',
    })

    await sendTemplate('app.text-only', { from: 'a@x.com', to: 'b@x.com' })

    const message = sendMailMock.mock.calls[0]?.[0]
    expect(message?.html).toBeUndefined()
    expect(message?.htmlKey).toBeUndefined()
  })
})

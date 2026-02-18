/**
 * Mock email implementation for testing.
 *
 * @module
 */

import type { EmailMessage, EmailSendResult, EmailTransport } from '@molecule/api-emails'

/**
 * Creates a mock email transport for testing.
 * @returns The created instance.
 */
export const createMockEmail = (): EmailTransport & {
  sentMessages: EmailMessage[]
  reset: () => void
  failNext: (error: Error) => void
} => {
  const sentMessages: EmailMessage[] = []
  let nextError: Error | null = null

  return {
    sentMessages,

    reset(): void {
      sentMessages.length = 0
      nextError = null
    },

    failNext(error: Error): void {
      nextError = error
    },

    async sendMail(message: EmailMessage): Promise<EmailSendResult> {
      if (nextError) {
        const error = nextError
        nextError = null
        throw error
      }

      sentMessages.push(message)

      const toList = Array.isArray(message.to) ? message.to : [message.to]
      const accepted = toList.map((addr) => (typeof addr === 'string' ? addr : addr.address))

      return {
        accepted,
        rejected: [],
        messageId: `mock-${crypto.randomUUID()}`,
        response: 'OK',
      }
    },
  }
}

/**
 * Pre-configured mock email for quick setup.
 */
export const mockEmail = createMockEmail()

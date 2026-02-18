/**
 * Type definitions for the SendGrid email provider.
 *
 * @module
 */

export type { EmailMessage, EmailSendResult, EmailTransport } from '@molecule/api-emails'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * The key used for SendGrid's API.
       */
      SENDGRID_API_KEY?: string
    }
  }
}

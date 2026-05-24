/**
 * Type definitions for the Mailgun email provider.
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
       * The key used for Mailgun's API.
       */
      MAILGUN_API_KEY?: string

      /**
       * The domain for Mailgun emails.
       */
      MAILGUN_DOMAIN?: string

      /**
       * Optional Mailgun API host override (e.g. `api.eu.mailgun.net` for the
       * EU region, or a credential-broker / self-hosted endpoint). When unset,
       * the transport's built-in default host is used.
       */
      MAILGUN_API_HOST?: string
    }
  }
}

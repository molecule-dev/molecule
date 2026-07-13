/**
 * Type definitions for the sendmail email provider.
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
       * Optional path to the sendmail binary. Defaults to
       * `/usr/sbin/sendmail` when unset. Read once at module load.
       */
      SENDMAIL_PATH?: string
    }
  }
}

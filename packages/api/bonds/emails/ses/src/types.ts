/**
 * Type definitions for the AWS SES email provider.
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
       * The AWS API access key ID.
       */
      AWS_ACCESS_KEY_ID?: string

      /**
       * The AWS API secret access key.
       */
      AWS_SECRET_ACCESS_KEY?: string

      /**
       * The AWS region for SES.
       *
       * @default us-east-1
       */
      AWS_SES_REGION?: string
    }
  }
}

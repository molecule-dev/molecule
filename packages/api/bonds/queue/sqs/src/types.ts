/**
 * Type definitions for AWS SQS queue provider.
 *
 * @module
 */

// Re-export core interface types
export type {
  MessageHandler,
  Queue,
  QueueCreateOptions,
  QueueMessage,
  QueueProvider,
  ReceivedMessage,
  ReceiveOptions,
} from '@molecule/api-queue'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * AWS region.
       */
      AWS_REGION?: string
      /**
       * AWS access key ID.
       */
      AWS_ACCESS_KEY_ID?: string
      /**
       * AWS secret access key.
       */
      AWS_SECRET_ACCESS_KEY?: string
      /**
       * SQS endpoint URL (for LocalStack or custom endpoints).
       */
      SQS_ENDPOINT?: string
    }
  }
}

/**
 * Options for creating an SQS queue provider.
 */
export interface SQSOptions {
  region?: string
  accessKeyId?: string
  secretAccessKey?: string
  endpoint?: string
  accountId?: string
}

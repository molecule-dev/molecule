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

  /**
   * When `true`, resolving a queue name that does not yet exist in AWS
   * auto-creates a standard (non-FIFO) queue with default settings instead
   * of rejecting with `QueueDoesNotExist` — matching the memory/redis
   * bonds' "just works" first-send behavior. Off by default: unlike an
   * in-process or self-hosted broker, silently creating AWS resources has
   * cost and IAM-permission implications, so opting in is a deliberate
   * choice. When off (the default), create the queue via `createQueue()`,
   * the AWS console, or infrastructure-as-code before sending to it.
   */
  autoCreateQueues?: boolean
}

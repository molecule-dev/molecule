/**
 * Type definitions for Redis/BullMQ queue provider.
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
       * Redis connection URL.
       */
      REDIS_URL?: string
      /**
       * Redis host.
       */
      REDIS_HOST?: string
      /**
       * Redis port.
       */
      REDIS_PORT?: string
      /**
       * Redis password.
       */
      REDIS_PASSWORD?: string
    }
  }
}

/**
 * Options for creating a Redis queue provider.
 */
export interface RedisQueueOptions {
  url?: string
  host?: string
  port?: number
  password?: string
  prefix?: string
}

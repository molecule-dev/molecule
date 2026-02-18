/**
 * Type definitions for RabbitMQ queue provider.
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
       * RabbitMQ connection URL.
       */
      RABBITMQ_URL?: string
      /**
       * RabbitMQ host.
       */
      RABBITMQ_HOST?: string
      /**
       * RabbitMQ port.
       */
      RABBITMQ_PORT?: string
      /**
       * RabbitMQ username.
       */
      RABBITMQ_USER?: string
      /**
       * RabbitMQ password.
       */
      RABBITMQ_PASSWORD?: string
      /**
       * RabbitMQ virtual host.
       */
      RABBITMQ_VHOST?: string
    }
  }
}

/**
 * Options for creating a RabbitMQ queue provider.
 */
export interface RabbitMQOptions {
  url?: string
  host?: string
  port?: number
  username?: string
  password?: string
  vhost?: string
  prefetch?: number
}

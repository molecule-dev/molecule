/**
 * Type definitions for queue/messaging core interface.
 *
 * @module
 */

/**
 * Message to be sent to a queue.
 */
export interface QueueMessage<T = unknown> {
  /**
   * Message payload.
   */
  body: T

  /**
   * Message ID (auto-generated if not provided).
   */
  id?: string

  /**
   * Delay in seconds before the message becomes visible.
   */
  delaySeconds?: number

  /**
   * Message attributes/headers.
   */
  attributes?: Record<string, string | number | boolean>

  /**
   * Message group ID (for FIFO queues).
   */
  groupId?: string

  /**
   * Deduplication ID (for FIFO queues).
   */
  deduplicationId?: string
}

/**
 * Received message from a queue.
 */
export interface ReceivedMessage<T = unknown> {
  /**
   * Message ID.
   */
  id: string

  /**
   * Message payload.
   */
  body: T

  /**
   * Receipt handle for acknowledging the message.
   */
  receiptHandle: string

  /**
   * Message attributes/headers.
   */
  attributes?: Record<string, string | number | boolean>

  /**
   * Number of times this message has been received.
   */
  receiveCount?: number

  /**
   * Timestamp when the message was sent.
   */
  sentTimestamp?: Date

  /**
   * Acknowledges (deletes) the message from the queue.
   */
  ack(): Promise<void>

  /**
   * Rejects the message (returns it to the queue).
   */
  nack?(): Promise<void>
}

/**
 * Options for receiving messages.
 */
export interface ReceiveOptions {
  /**
   * Maximum number of messages to receive.
   */
  maxMessages?: number

  /**
   * Visibility timeout in seconds.
   */
  visibilityTimeout?: number

  /**
   * Wait time in seconds for long polling.
   */
  waitTimeSeconds?: number
}

/**
 * Async callback invoked for each message received from a queue subscription.
 */
export type MessageHandler<T = unknown> = (message: ReceivedMessage<T>) => Promise<void>

/**
 * Handle for a named queue, providing send, receive, and subscribe operations.
 */
export interface Queue {
  /**
   * Queue name.
   */
  name: string

  /**
   * Sends a message to the queue.
   */
  send<T = unknown>(message: QueueMessage<T>): Promise<string>

  /**
   * Sends multiple messages to the queue.
   */
  sendBatch?<T = unknown>(messages: QueueMessage<T>[]): Promise<string[]>

  /**
   * Receives messages from the queue.
   */
  receive<T = unknown>(options?: ReceiveOptions): Promise<ReceivedMessage<T>[]>

  /**
   * Subscribes to messages from the queue.
   * Returns a function to unsubscribe.
   */
  subscribe<T = unknown>(handler: MessageHandler<T>, options?: ReceiveOptions): () => void

  /**
   * Gets the approximate number of messages in the queue.
   */
  size?(): Promise<number>

  /**
   * Purges all messages from the queue.
   */
  purge?(): Promise<void>
}

/**
 * Queue provider interface that all queue bond packages must implement.
 * Provides queue handle creation and optional queue management operations.
 */
export interface QueueProvider {
  /**
   * Gets or creates a queue by name.
   */
  queue(name: string): Queue

  /**
   * Lists all available queues.
   */
  listQueues?(): Promise<string[]>

  /**
   * Creates a new queue.
   */
  createQueue?(name: string, options?: QueueCreateOptions): Promise<Queue>

  /**
   * Deletes a queue.
   */
  deleteQueue?(name: string): Promise<void>

  /**
   * Closes all connections.
   */
  close?(): Promise<void>
}

/**
 * Options for creating a new queue, including FIFO mode, timeouts,
 * retention periods, and dead-letter queue configuration.
 */
export interface QueueCreateOptions {
  /**
   * Whether this is a FIFO queue.
   */
  fifo?: boolean

  /**
   * Default visibility timeout in seconds.
   */
  visibilityTimeout?: number

  /**
   * Message retention period in seconds.
   */
  messageRetentionSeconds?: number

  /**
   * Maximum message size in bytes.
   */
  maxMessageSize?: number

  /**
   * Dead letter queue configuration.
   */
  deadLetterQueue?: {
    name: string
    maxReceiveCount: number
  }
}

/**
 * Queue/messaging bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-queue-sqs`) call `setProvider()` during
 * setup. Application code uses `queue()`, `send()`, `receive()`, and
 * `subscribe()` directly.
 *
 * @module
 */

import { bond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  MessageHandler,
  Queue,
  QueueMessage,
  QueueProvider,
  ReceivedMessage,
  ReceiveOptions,
} from './types.js'

const BOND_TYPE = 'queue'

/**
 * Registers a queue provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The queue provider implementation to bond.
 */
export const setProvider = (provider: QueueProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded queue provider, throwing if none is configured.
 *
 * @returns The bonded queue provider.
 * @throws {Error} If no queue provider has been bonded.
 */
export const getProvider = (): QueueProvider => {
  try {
    return bondRequire<QueueProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('queue.error.noProvider', undefined, {
        defaultValue: 'Queue provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a queue provider is currently bonded.
 *
 * @returns `true` if a queue provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Gets or creates a queue handle by name via the bonded provider.
 *
 * @param name - The queue name.
 * @returns The queue handle for sending, receiving, and subscribing.
 * @throws {Error} If no queue provider has been bonded.
 */
export const queue = (name: string): Queue => {
  return getProvider().queue(name)
}

/**
 * Sends a message to a named queue via the bonded provider.
 *
 * @param queueName - The target queue name.
 * @param message - The message to send, including body and optional attributes.
 * @returns The message ID assigned by the queue provider.
 * @throws {Error} If no queue provider has been bonded.
 */
export const send = async <T = unknown>(
  queueName: string,
  message: QueueMessage<T>,
): Promise<string> => {
  return getProvider().queue(queueName).send(message)
}

/**
 * Receives messages from a named queue via the bonded provider.
 *
 * @param queueName - The queue to receive messages from.
 * @param options - Receive options such as max messages, visibility timeout, and long-poll wait time.
 * @returns An array of received messages, each with an `ack()` method for acknowledgement.
 * @throws {Error} If no queue provider has been bonded.
 */
export const receive = async <T = unknown>(
  queueName: string,
  options?: ReceiveOptions,
): Promise<ReceivedMessage<T>[]> => {
  return getProvider().queue(queueName).receive(options)
}

/**
 * Subscribes to messages from a named queue. The handler is called for each
 * incoming message. Returns an unsubscribe function to stop listening.
 *
 * @param queueName - The queue to subscribe to.
 * @param handler - Async callback invoked for each received message.
 * @param options - Receive options such as max messages and visibility timeout.
 * @returns A function that stops the subscription when called.
 * @throws {Error} If no queue provider has been bonded.
 */
export const subscribe = <T = unknown>(
  queueName: string,
  handler: MessageHandler<T>,
  options?: ReceiveOptions,
): (() => void) => {
  return getProvider().queue(queueName).subscribe(handler, options)
}

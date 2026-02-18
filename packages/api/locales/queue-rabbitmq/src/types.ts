/** Translation keys for the queue-rabbitmq locale package. */
export type QueueRabbitmqTranslationKey =
  | 'queue.rabbitmq.error.sendBatchNotSupported'
  | 'queue.rabbitmq.error.createQueueNotSupported'

/** Translation record mapping queue-rabbitmq keys to translated strings. */
export type QueueRabbitmqTranslations = {
  [key in QueueRabbitmqTranslationKey]: string
}

/**
 * Mock queue implementation for testing.
 *
 * @module
 */

import type {
  MessageHandler,
  Queue,
  QueueMessage,
  QueueProvider,
  ReceivedMessage,
  ReceiveOptions,
} from '@molecule/api-queue'

/**
 * Creates an in-memory mock queue instance for testing, with synchronous subscriber notification.
 * @param name - The queue name.
 * @returns A Queue instance with an exposed `messages` array for assertions.
 */
const createMockQueueInstance = (
  name: string,
): Queue & {
  messages: Array<{ id: string; body: unknown }>
} => {
  const messages: Array<{ id: string; body: unknown }> = []
  const subscribers: Map<string, MessageHandler<unknown>> = new Map()

  return {
    name,
    messages,

    async send<T = unknown>(message: QueueMessage<T>): Promise<string> {
      const id = message.id ?? crypto.randomUUID()
      messages.push({ id, body: message.body })

      // Notify subscribers
      for (const handler of subscribers.values()) {
        const receivedMessage: ReceivedMessage<T> = {
          id,
          body: message.body,
          receiptHandle: id,
          async ack() {
            const idx = messages.findIndex((m) => m.id === id)
            if (idx !== -1) messages.splice(idx, 1)
          },
          async nack() {},
        }
        // Call handler asynchronously
        setImmediate(() => handler(receivedMessage as ReceivedMessage<unknown>))
      }

      return id
    },

    async sendBatch<T = unknown>(msgs: QueueMessage<T>[]): Promise<string[]> {
      const ids: string[] = []
      for (const msg of msgs) {
        ids.push(await this.send(msg))
      }
      return ids
    },

    async receive<T = unknown>(options?: ReceiveOptions): Promise<ReceivedMessage<T>[]> {
      const max = options?.maxMessages ?? 10
      const received = messages.slice(0, max)

      return received.map((msg) => ({
        id: msg.id,
        body: msg.body as T,
        receiptHandle: msg.id,
        async ack() {
          const idx = messages.findIndex((m) => m.id === msg.id)
          if (idx !== -1) messages.splice(idx, 1)
        },
        async nack() {},
      }))
    },

    subscribe<T = unknown>(handler: MessageHandler<T>, _options?: ReceiveOptions): () => void {
      const id = crypto.randomUUID()
      subscribers.set(id, handler as MessageHandler<unknown>)
      return () => subscribers.delete(id)
    },

    async size(): Promise<number> {
      return messages.length
    },

    async purge(): Promise<void> {
      messages.length = 0
    },
  }
}

/**
 * Creates a mock QueueProvider for testing, with lazily-created in-memory queues and a `reset()` method.
 * @returns A QueueProvider with exposed `queues` map and `reset()` for test cleanup.
 */
export const createMockQueue = (): QueueProvider & {
  queues: Map<string, ReturnType<typeof createMockQueueInstance>>
  reset: () => void
} => {
  const queues = new Map<string, ReturnType<typeof createMockQueueInstance>>()

  return {
    queues,

    reset(): void {
      queues.clear()
    },

    queue(name: string): Queue {
      let q = queues.get(name)
      if (!q) {
        q = createMockQueueInstance(name)
        queues.set(name, q)
      }
      return q
    },

    async listQueues(): Promise<string[]> {
      return Array.from(queues.keys())
    },

    async createQueue(name: string): Promise<Queue> {
      return this.queue(name)
    },

    async deleteQueue(name: string): Promise<void> {
      queues.delete(name)
    },

    async close(): Promise<void> {},
  }
}

/** Pre-configured mock queue provider instance for quick test setup. */
export const mockQueue = createMockQueue()

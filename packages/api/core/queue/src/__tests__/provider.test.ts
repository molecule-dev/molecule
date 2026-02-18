import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type {
  MessageHandler,
  Queue,
  QueueCreateOptions,
  QueueMessage,
  QueueProvider,
  ReceivedMessage,
  ReceiveOptions,
} from '../types.js'

// We need to reset the module state between tests
let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let queue: typeof ProviderModule.queue
let send: typeof ProviderModule.send
let receive: typeof ProviderModule.receive
let subscribe: typeof ProviderModule.subscribe

/**
 * Creates a mock Queue instance for testing.
 */
const createMockQueue = (name: string, overrides: Partial<Queue> = {}): Queue => ({
  name,
  send: vi.fn().mockResolvedValue('message-id-123'),
  receive: vi.fn().mockResolvedValue([]),
  subscribe: vi.fn().mockReturnValue(() => {}),
  ...overrides,
})

/**
 * Creates a mock QueueProvider instance for testing.
 */
const createMockProvider = (queueOverrides: Partial<Queue> = {}): QueueProvider => {
  const mockQueues = new Map<string, Queue>()
  return {
    queue: vi.fn((name: string) => {
      if (!mockQueues.has(name)) {
        mockQueues.set(name, createMockQueue(name, queueOverrides))
      }
      return mockQueues.get(name)!
    }),
  }
}

/**
 * Creates a mock ReceivedMessage for testing.
 */
const createMockReceivedMessage = <T>(
  body: T,
  overrides: Partial<ReceivedMessage<T>> = {},
): ReceivedMessage<T> => ({
  id: 'msg-id-123',
  body,
  receiptHandle: 'receipt-handle-abc',
  ack: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

describe('queue provider', () => {
  beforeEach(async () => {
    // Reset modules to get fresh state
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    queue = providerModule.queue
    send = providerModule.send
    receive = providerModule.receive
    subscribe = providerModule.subscribe
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Queue provider not configured. Call setProvider() first.',
      )
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })

    it('should allow replacing the provider', () => {
      const firstProvider = createMockProvider()
      const secondProvider = createMockProvider()

      setProvider(firstProvider)
      expect(getProvider()).toBe(firstProvider)

      setProvider(secondProvider)
      expect(getProvider()).toBe(secondProvider)
    })
  })

  describe('queue', () => {
    it('should throw when no provider is set', () => {
      expect(() => queue('test-queue')).toThrow('Queue provider not configured')
    })

    it('should call provider queue method', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      const result = queue('my-queue')

      expect(mockProvider.queue).toHaveBeenCalledWith('my-queue')
      expect(result.name).toBe('my-queue')
    })

    it('should return the same queue instance for the same name', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      const queue1 = queue('my-queue')
      const queue2 = queue('my-queue')

      expect(queue1).toBe(queue2)
    })

    it('should return different queue instances for different names', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      const queue1 = queue('queue-1')
      const queue2 = queue('queue-2')

      expect(queue1).not.toBe(queue2)
      expect(queue1.name).toBe('queue-1')
      expect(queue2.name).toBe('queue-2')
    })
  })

  describe('send', () => {
    it('should throw when no provider is set', async () => {
      await expect(send('test-queue', { body: 'test' })).rejects.toThrow(
        'Queue provider not configured',
      )
    })

    it('should send a message to the queue', async () => {
      const mockSend = vi.fn().mockResolvedValue('msg-id-456')
      const mockProvider = createMockProvider({ send: mockSend })
      setProvider(mockProvider)

      const message: QueueMessage<string> = { body: 'Hello, World!' }
      const messageId = await send('my-queue', message)

      expect(mockProvider.queue).toHaveBeenCalledWith('my-queue')
      expect(mockSend).toHaveBeenCalledWith(message)
      expect(messageId).toBe('msg-id-456')
    })

    it('should send a message with all options', async () => {
      const mockSend = vi.fn().mockResolvedValue('msg-id-789')
      const mockProvider = createMockProvider({ send: mockSend })
      setProvider(mockProvider)

      const message: QueueMessage<{ orderId: number }> = {
        body: { orderId: 123 },
        id: 'custom-id',
        delaySeconds: 60,
        attributes: { priority: 'high', source: 'api' },
        groupId: 'order-group',
        deduplicationId: 'dedup-123',
      }
      await send('orders-queue', message)

      expect(mockSend).toHaveBeenCalledWith(message)
    })

    it('should handle send errors', async () => {
      const mockSend = vi.fn().mockRejectedValue(new Error('Send failed'))
      const mockProvider = createMockProvider({ send: mockSend })
      setProvider(mockProvider)

      await expect(send('my-queue', { body: 'test' })).rejects.toThrow('Send failed')
    })

    it('should send typed messages', async () => {
      interface OrderMessage {
        orderId: string
        amount: number
        currency: string
      }

      const mockSend = vi.fn().mockResolvedValue('order-msg-id')
      const mockProvider = createMockProvider({ send: mockSend })
      setProvider(mockProvider)

      const message: QueueMessage<OrderMessage> = {
        body: {
          orderId: 'ORD-001',
          amount: 99.99,
          currency: 'USD',
        },
      }
      await send<OrderMessage>('orders', message)

      expect(mockSend).toHaveBeenCalledWith(message)
    })
  })

  describe('receive', () => {
    it('should throw when no provider is set', async () => {
      await expect(receive('test-queue')).rejects.toThrow('Queue provider not configured')
    })

    it('should receive messages from the queue', async () => {
      const mockMessages: ReceivedMessage<string>[] = [
        createMockReceivedMessage('message 1'),
        createMockReceivedMessage('message 2', { id: 'msg-id-456', receiptHandle: 'receipt-456' }),
      ]
      const mockReceive = vi.fn().mockResolvedValue(mockMessages)
      const mockProvider = createMockProvider({ receive: mockReceive })
      setProvider(mockProvider)

      const messages = await receive<string>('my-queue')

      expect(mockProvider.queue).toHaveBeenCalledWith('my-queue')
      expect(mockReceive).toHaveBeenCalledWith(undefined)
      expect(messages).toHaveLength(2)
      expect(messages[0].body).toBe('message 1')
      expect(messages[1].body).toBe('message 2')
    })

    it('should receive messages with options', async () => {
      const mockReceive = vi.fn().mockResolvedValue([])
      const mockProvider = createMockProvider({ receive: mockReceive })
      setProvider(mockProvider)

      const options: ReceiveOptions = {
        maxMessages: 10,
        visibilityTimeout: 30,
        waitTimeSeconds: 20,
      }
      await receive('my-queue', options)

      expect(mockReceive).toHaveBeenCalledWith(options)
    })

    it('should return empty array when no messages available', async () => {
      const mockReceive = vi.fn().mockResolvedValue([])
      const mockProvider = createMockProvider({ receive: mockReceive })
      setProvider(mockProvider)

      const messages = await receive('empty-queue')

      expect(messages).toEqual([])
    })

    it('should handle receive errors', async () => {
      const mockReceive = vi.fn().mockRejectedValue(new Error('Receive failed'))
      const mockProvider = createMockProvider({ receive: mockReceive })
      setProvider(mockProvider)

      await expect(receive('my-queue')).rejects.toThrow('Receive failed')
    })

    it('should receive typed messages', async () => {
      interface TaskMessage {
        taskId: string
        action: string
      }

      const mockMessages: ReceivedMessage<TaskMessage>[] = [
        createMockReceivedMessage({ taskId: 'task-1', action: 'process' }),
      ]
      const mockReceive = vi.fn().mockResolvedValue(mockMessages)
      const mockProvider = createMockProvider({ receive: mockReceive })
      setProvider(mockProvider)

      const messages = await receive<TaskMessage>('tasks-queue')

      expect(messages[0].body.taskId).toBe('task-1')
      expect(messages[0].body.action).toBe('process')
    })
  })

  describe('subscribe', () => {
    it('should throw when no provider is set', () => {
      const handler: MessageHandler<string> = async () => {}
      expect(() => subscribe('test-queue', handler)).toThrow('Queue provider not configured')
    })

    it('should subscribe to messages', () => {
      const mockUnsubscribe = vi.fn()
      const mockSubscribe = vi.fn().mockReturnValue(mockUnsubscribe)
      const mockProvider = createMockProvider({ subscribe: mockSubscribe })
      setProvider(mockProvider)

      const handler: MessageHandler<string> = async (message) => {
        console.log(message.body)
      }
      const unsubscribe = subscribe('my-queue', handler)

      expect(mockProvider.queue).toHaveBeenCalledWith('my-queue')
      expect(mockSubscribe).toHaveBeenCalledWith(handler, undefined)
      expect(typeof unsubscribe).toBe('function')
    })

    it('should subscribe with options', () => {
      const mockSubscribe = vi.fn().mockReturnValue(() => {})
      const mockProvider = createMockProvider({ subscribe: mockSubscribe })
      setProvider(mockProvider)

      const handler: MessageHandler<string> = async () => {}
      const options: ReceiveOptions = {
        maxMessages: 1,
        visibilityTimeout: 60,
      }
      subscribe('my-queue', handler, options)

      expect(mockSubscribe).toHaveBeenCalledWith(handler, options)
    })

    it('should return unsubscribe function', () => {
      const mockUnsubscribe = vi.fn()
      const mockSubscribe = vi.fn().mockReturnValue(mockUnsubscribe)
      const mockProvider = createMockProvider({ subscribe: mockSubscribe })
      setProvider(mockProvider)

      const handler: MessageHandler<string> = async () => {}
      const unsubscribe = subscribe('my-queue', handler)

      unsubscribe()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })

    it('should handle typed message handlers', () => {
      interface EventMessage {
        eventType: string
        payload: Record<string, unknown>
      }

      const mockSubscribe = vi.fn().mockReturnValue(() => {})
      const mockProvider = createMockProvider({ subscribe: mockSubscribe })
      setProvider(mockProvider)

      const handler: MessageHandler<EventMessage> = async (message) => {
        expect(message.body.eventType).toBeDefined()
      }
      subscribe<EventMessage>('events-queue', handler)

      expect(mockSubscribe).toHaveBeenCalledWith(handler, undefined)
    })
  })
})

describe('queue types', () => {
  describe('QueueMessage', () => {
    it('should support minimal message', () => {
      const message: QueueMessage<string> = {
        body: 'Hello',
      }
      expect(message.body).toBe('Hello')
    })

    it('should support full message options', () => {
      const message: QueueMessage<{ data: string }> = {
        body: { data: 'test' },
        id: 'custom-id',
        delaySeconds: 30,
        attributes: { key: 'value', count: 42, flag: true },
        groupId: 'group-1',
        deduplicationId: 'dedup-1',
      }
      expect(message.id).toBe('custom-id')
      expect(message.delaySeconds).toBe(30)
      expect(message.attributes?.key).toBe('value')
      expect(message.attributes?.count).toBe(42)
      expect(message.attributes?.flag).toBe(true)
      expect(message.groupId).toBe('group-1')
      expect(message.deduplicationId).toBe('dedup-1')
    })
  })

  describe('ReceivedMessage', () => {
    it('should have required properties', () => {
      const message: ReceivedMessage<string> = {
        id: 'msg-123',
        body: 'test message',
        receiptHandle: 'receipt-abc',
        ack: async () => {},
      }
      expect(message.id).toBe('msg-123')
      expect(message.body).toBe('test message')
      expect(message.receiptHandle).toBe('receipt-abc')
      expect(typeof message.ack).toBe('function')
    })

    it('should support optional properties', () => {
      const sentTime = new Date()
      const message: ReceivedMessage<{ payload: string }> = {
        id: 'msg-456',
        body: { payload: 'data' },
        receiptHandle: 'receipt-xyz',
        attributes: { source: 'test' },
        receiveCount: 3,
        sentTimestamp: sentTime,
        ack: async () => {},
        nack: async () => {},
      }
      expect(message.attributes?.source).toBe('test')
      expect(message.receiveCount).toBe(3)
      expect(message.sentTimestamp).toBe(sentTime)
      expect(typeof message.nack).toBe('function')
    })
  })

  describe('ReceiveOptions', () => {
    it('should support all options', () => {
      const options: ReceiveOptions = {
        maxMessages: 10,
        visibilityTimeout: 30,
        waitTimeSeconds: 20,
      }
      expect(options.maxMessages).toBe(10)
      expect(options.visibilityTimeout).toBe(30)
      expect(options.waitTimeSeconds).toBe(20)
    })

    it('should support partial options', () => {
      const options: ReceiveOptions = {
        maxMessages: 5,
      }
      expect(options.maxMessages).toBe(5)
      expect(options.visibilityTimeout).toBeUndefined()
    })
  })

  describe('Queue interface', () => {
    it('should define required methods', () => {
      const mockQueue: Queue = {
        name: 'test-queue',
        send: async <T>(_message: QueueMessage<T>): Promise<string> => 'msg-id',
        receive: async <T>(_options?: ReceiveOptions): Promise<ReceivedMessage<T>[]> => [],
        subscribe:
          <T>(_handler: MessageHandler<T>, _options?: ReceiveOptions): (() => void) =>
          () => {},
      }
      expect(mockQueue.name).toBe('test-queue')
      expect(typeof mockQueue.send).toBe('function')
      expect(typeof mockQueue.receive).toBe('function')
      expect(typeof mockQueue.subscribe).toBe('function')
    })

    it('should support optional methods', () => {
      const mockQueue: Queue = {
        name: 'test-queue',
        send: async () => 'msg-id',
        receive: async () => [],
        subscribe: () => () => {},
        sendBatch: async <T>(_messages: QueueMessage<T>[]): Promise<string[]> => ['id-1', 'id-2'],
        size: async (): Promise<number> => 42,
        purge: async (): Promise<void> => {},
      }
      expect(typeof mockQueue.sendBatch).toBe('function')
      expect(typeof mockQueue.size).toBe('function')
      expect(typeof mockQueue.purge).toBe('function')
    })
  })

  describe('QueueProvider interface', () => {
    it('should define required queue method', () => {
      const provider: QueueProvider = {
        queue: (_name: string): Queue => ({
          name: _name,
          send: async () => 'id',
          receive: async () => [],
          subscribe: () => () => {},
        }),
      }
      expect(typeof provider.queue).toBe('function')
    })

    it('should support optional methods', () => {
      const provider: QueueProvider = {
        queue: (name: string): Queue => ({
          name,
          send: async () => 'id',
          receive: async () => [],
          subscribe: () => () => {},
        }),
        listQueues: async (): Promise<string[]> => ['queue-1', 'queue-2'],
        createQueue: async (name: string, _options?: QueueCreateOptions): Promise<Queue> => ({
          name,
          send: async () => 'id',
          receive: async () => [],
          subscribe: () => () => {},
        }),
        deleteQueue: async (_name: string): Promise<void> => {},
        close: async (): Promise<void> => {},
      }
      expect(typeof provider.listQueues).toBe('function')
      expect(typeof provider.createQueue).toBe('function')
      expect(typeof provider.deleteQueue).toBe('function')
      expect(typeof provider.close).toBe('function')
    })
  })

  describe('QueueCreateOptions', () => {
    it('should support all options', () => {
      const options: QueueCreateOptions = {
        fifo: true,
        visibilityTimeout: 60,
        messageRetentionSeconds: 86400,
        maxMessageSize: 262144,
        deadLetterQueue: {
          name: 'dlq-queue',
          maxReceiveCount: 3,
        },
      }
      expect(options.fifo).toBe(true)
      expect(options.visibilityTimeout).toBe(60)
      expect(options.messageRetentionSeconds).toBe(86400)
      expect(options.maxMessageSize).toBe(262144)
      expect(options.deadLetterQueue?.name).toBe('dlq-queue')
      expect(options.deadLetterQueue?.maxReceiveCount).toBe(3)
    })

    it('should support partial options', () => {
      const options: QueueCreateOptions = {
        fifo: true,
      }
      expect(options.fifo).toBe(true)
      expect(options.visibilityTimeout).toBeUndefined()
    })
  })
})

describe('message acknowledgment', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    receive = providerModule.receive
  })

  it('should acknowledge a message', async () => {
    const mockAck = vi.fn().mockResolvedValue(undefined)
    const mockMessage = createMockReceivedMessage('test', { ack: mockAck })
    const mockReceive = vi.fn().mockResolvedValue([mockMessage])
    const mockProvider = createMockProvider({ receive: mockReceive })
    setProvider(mockProvider)

    const messages = await receive<string>('my-queue')
    await messages[0].ack()

    expect(mockAck).toHaveBeenCalled()
  })

  it('should reject (nack) a message', async () => {
    const mockNack = vi.fn().mockResolvedValue(undefined)
    const mockMessage = createMockReceivedMessage('test', { nack: mockNack })
    const mockReceive = vi.fn().mockResolvedValue([mockMessage])
    const mockProvider = createMockProvider({ receive: mockReceive })
    setProvider(mockProvider)

    const messages = await receive<string>('my-queue')
    await messages[0].nack?.()

    expect(mockNack).toHaveBeenCalled()
  })

  it('should handle ack errors', async () => {
    const mockAck = vi.fn().mockRejectedValue(new Error('Ack failed'))
    const mockMessage = createMockReceivedMessage('test', { ack: mockAck })
    const mockReceive = vi.fn().mockResolvedValue([mockMessage])
    const mockProvider = createMockProvider({ receive: mockReceive })
    setProvider(mockProvider)

    const messages = await receive<string>('my-queue')
    await expect(messages[0].ack()).rejects.toThrow('Ack failed')
  })
})

describe('optional queue methods', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    queue = providerModule.queue
  })

  describe('sendBatch', () => {
    it('should send batch messages when available', async () => {
      const mockSendBatch = vi.fn().mockResolvedValue(['id-1', 'id-2', 'id-3'])
      const mockProvider = createMockProvider({ sendBatch: mockSendBatch })
      setProvider(mockProvider)

      const q = queue('batch-queue')
      const messages: QueueMessage<string>[] = [
        { body: 'msg-1' },
        { body: 'msg-2' },
        { body: 'msg-3' },
      ]
      const ids = await q.sendBatch?.(messages)

      expect(mockSendBatch).toHaveBeenCalledWith(messages)
      expect(ids).toEqual(['id-1', 'id-2', 'id-3'])
    })
  })

  describe('size', () => {
    it('should return queue size when available', async () => {
      const mockSize = vi.fn().mockResolvedValue(42)
      const mockProvider = createMockProvider({ size: mockSize })
      setProvider(mockProvider)

      const q = queue('sized-queue')
      const size = await q.size?.()

      expect(mockSize).toHaveBeenCalled()
      expect(size).toBe(42)
    })
  })

  describe('purge', () => {
    it('should purge queue when available', async () => {
      const mockPurge = vi.fn().mockResolvedValue(undefined)
      const mockProvider = createMockProvider({ purge: mockPurge })
      setProvider(mockProvider)

      const q = queue('purgeable-queue')
      await q.purge?.()

      expect(mockPurge).toHaveBeenCalled()
    })
  })
})

describe('optional provider methods', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
  })

  it('should list queues when available', async () => {
    const mockProvider: QueueProvider = {
      queue: vi.fn(),
      listQueues: vi.fn().mockResolvedValue(['queue-a', 'queue-b', 'queue-c']),
    }
    setProvider(mockProvider)

    const queues = await getProvider().listQueues?.()

    expect(queues).toEqual(['queue-a', 'queue-b', 'queue-c'])
  })

  it('should create queue when available', async () => {
    const createdQueue = createMockQueue('new-queue')
    const mockProvider: QueueProvider = {
      queue: vi.fn(),
      createQueue: vi.fn().mockResolvedValue(createdQueue),
    }
    setProvider(mockProvider)

    const options: QueueCreateOptions = { fifo: true, visibilityTimeout: 30 }
    const q = await getProvider().createQueue?.('new-queue', options)

    expect(mockProvider.createQueue).toHaveBeenCalledWith('new-queue', options)
    expect(q?.name).toBe('new-queue')
  })

  it('should delete queue when available', async () => {
    const mockProvider: QueueProvider = {
      queue: vi.fn(),
      deleteQueue: vi.fn().mockResolvedValue(undefined),
    }
    setProvider(mockProvider)

    await getProvider().deleteQueue?.('old-queue')

    expect(mockProvider.deleteQueue).toHaveBeenCalledWith('old-queue')
  })

  it('should close provider when available', async () => {
    const mockProvider: QueueProvider = {
      queue: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    }
    setProvider(mockProvider)

    await getProvider().close?.()

    expect(mockProvider.close).toHaveBeenCalled()
  })
})

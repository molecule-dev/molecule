import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

// Mock amqplib
vi.mock('amqplib', () => ({
  default: {
    connect: vi.fn(),
  },
}))

import type { Channel, ConsumeMessage, GetMessage } from 'amqplib'
import amqp from 'amqplib'

import { connect, createProvider } from '../provider.js'
import { createQueue, createReceivedMessage, createReceivedMessageFromGet } from '../queue.js'

describe('RabbitMQ Queue Provider', () => {
  let mockConnection: {
    createChannel: Mock
    on: Mock
    close: Mock
  }
  let mockChannel: {
    prefetch: Mock
    assertQueue: Mock
    sendToQueue: Mock
    get: Mock
    consume: Mock
    cancel: Mock
    ack: Mock
    nack: Mock
    deleteQueue: Mock
    purgeQueue: Mock
    close: Mock
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockChannel = {
      prefetch: vi.fn(),
      assertQueue: vi.fn().mockResolvedValue({ messageCount: 5, consumerCount: 1 }),
      sendToQueue: vi.fn().mockReturnValue(true),
      get: vi.fn(),
      consume: vi.fn().mockResolvedValue({ consumerTag: 'test-consumer-tag' }),
      cancel: vi.fn().mockResolvedValue(undefined),
      ack: vi.fn(),
      nack: vi.fn(),
      deleteQueue: vi.fn().mockResolvedValue(undefined),
      purgeQueue: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    }

    mockConnection = {
      createChannel: vi.fn().mockResolvedValue(mockChannel),
      on: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    }
    ;(amqp.connect as Mock).mockResolvedValue(mockConnection)
  })

  describe('createProvider', () => {
    it('should connect to RabbitMQ with default options', async () => {
      const provider = await createProvider()

      expect(amqp.connect).toHaveBeenCalledWith('amqp://guest:guest@localhost:5672/')
      expect(mockConnection.createChannel).toHaveBeenCalled()
      expect(mockConnection.on).toHaveBeenCalledWith('error', expect.any(Function))
      expect(mockConnection.on).toHaveBeenCalledWith('close', expect.any(Function))
      expect(provider).toBeDefined()
      expect(provider.queue).toBeInstanceOf(Function)
    })

    it('should connect with a full URL when provided', async () => {
      const provider = await createProvider({
        url: 'amqp://user:pass@custom-host:5673/vhost',
      })

      expect(amqp.connect).toHaveBeenCalledWith('amqp://user:pass@custom-host:5673/vhost')
      expect(provider).toBeDefined()
    })

    it('should connect with individual options', async () => {
      const provider = await createProvider({
        host: 'rabbitmq.example.com',
        port: 5673,
        username: 'admin',
        password: 'secret',
        vhost: '/myapp',
      })

      expect(amqp.connect).toHaveBeenCalledWith(
        'amqp://admin:secret@rabbitmq.example.com:5673/myapp',
      )
      expect(provider).toBeDefined()
    })

    it('should set prefetch when provided', async () => {
      await createProvider({ prefetch: 10 })

      expect(mockChannel.prefetch).toHaveBeenCalledWith(10)
    })

    it('should throw on connection error', async () => {
      const error = new Error('Connection refused')
      ;(amqp.connect as Mock).mockRejectedValue(error)

      await expect(createProvider()).rejects.toThrow('Connection refused')
    })

    it('should use environment variables for configuration', async () => {
      const originalEnv = { ...process.env }
      process.env.RABBITMQ_HOST = 'env-host'
      process.env.RABBITMQ_PORT = '5674'
      process.env.RABBITMQ_USER = 'env-user'
      process.env.RABBITMQ_PASSWORD = 'env-pass'
      process.env.RABBITMQ_VHOST = '/env-vhost'

      try {
        await createProvider()
        expect(amqp.connect).toHaveBeenCalledWith(
          'amqp://env-user:env-pass@env-host:5674/env-vhost',
        )
      } finally {
        process.env = originalEnv
      }
    })

    it('should prioritize RABBITMQ_URL over individual options', async () => {
      const originalEnv = { ...process.env }
      process.env.RABBITMQ_URL = 'amqp://url-user:url-pass@url-host:5675/url-vhost'
      process.env.RABBITMQ_HOST = 'env-host'

      try {
        await createProvider()
        expect(amqp.connect).toHaveBeenCalledWith(
          'amqp://url-user:url-pass@url-host:5675/url-vhost',
        )
      } finally {
        process.env = originalEnv
      }
    })
  })

  describe('provider.queue', () => {
    it('should return a queue instance', async () => {
      const provider = await createProvider()
      const queue = provider.queue('test-queue')

      expect(queue).toBeDefined()
      expect(queue.name).toBe('test-queue')
    })

    it('should cache and reuse queue instances', async () => {
      const provider = await createProvider()
      const queue1 = provider.queue('test-queue')
      const queue2 = provider.queue('test-queue')

      expect(queue1).toBe(queue2)
    })

    it('should create different queues for different names', async () => {
      const provider = await createProvider()
      const queue1 = provider.queue('queue-1')
      const queue2 = provider.queue('queue-2')

      expect(queue1).not.toBe(queue2)
      expect(queue1.name).toBe('queue-1')
      expect(queue2.name).toBe('queue-2')
    })
  })

  describe('provider.createQueue', () => {
    it('should create a queue with default options', async () => {
      const provider = await createProvider()
      const queue = await provider.createQueue('new-queue')

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('new-queue', {
        durable: true,
        arguments: {},
      })
      expect(queue.name).toBe('new-queue')
    })

    it('should create a queue with message retention', async () => {
      const provider = await createProvider()
      await provider.createQueue('ttl-queue', { messageRetentionSeconds: 3600 })

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('ttl-queue', {
        durable: true,
        arguments: {
          'x-message-ttl': 3600000,
        },
      })
    })

    it('should create a queue with max message size', async () => {
      const provider = await createProvider()
      await provider.createQueue('size-queue', { maxMessageSize: 262144 })

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('size-queue', {
        durable: true,
        arguments: {
          'x-max-length-bytes': 262144,
        },
      })
    })

    it('should create a queue with dead letter queue', async () => {
      const provider = await createProvider()
      await provider.createQueue('main-queue', {
        deadLetterQueue: { name: 'dlq', maxReceiveCount: 3 },
      })

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('main-queue', {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': 'dlq',
        },
      })
    })
  })

  describe('provider.deleteQueue', () => {
    it('should delete a queue', async () => {
      const provider = await createProvider()
      await provider.deleteQueue('queue-to-delete')

      expect(mockChannel.deleteQueue).toHaveBeenCalledWith('queue-to-delete')
    })
  })

  describe('provider.listQueues', () => {
    it('should return list of known queues', async () => {
      const provider = await createProvider()
      provider.queue('queue-1')
      provider.queue('queue-2')

      const queues = await provider.listQueues()
      expect(queues).toEqual(['queue-1', 'queue-2'])
    })
  })

  describe('provider.close', () => {
    it('should close channel and connection', async () => {
      const provider = await createProvider()
      await provider.close()

      expect(mockChannel.close).toHaveBeenCalled()
      expect(mockConnection.close).toHaveBeenCalled()
    })
  })

  describe('connect alias', () => {
    it('should be an alias for createProvider', () => {
      expect(connect).toBe(createProvider)
    })
  })
})

describe('RabbitMQ Queue', () => {
  let mockChannel: {
    prefetch: Mock
    assertQueue: Mock
    sendToQueue: Mock
    get: Mock
    consume: Mock
    cancel: Mock
    ack: Mock
    nack: Mock
    purgeQueue: Mock
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockChannel = {
      prefetch: vi.fn(),
      assertQueue: vi.fn().mockResolvedValue({ messageCount: 5, consumerCount: 1 }),
      sendToQueue: vi.fn().mockReturnValue(true),
      get: vi.fn(),
      consume: vi.fn().mockResolvedValue({ consumerTag: 'test-consumer-tag' }),
      cancel: vi.fn().mockResolvedValue(undefined),
      ack: vi.fn(),
      nack: vi.fn(),
      purgeQueue: vi.fn().mockResolvedValue(undefined),
    }
  })

  describe('queue.send', () => {
    it('should send a message with auto-generated ID', async () => {
      const queue = createQueue(mockChannel as unknown as Channel, 'test-queue')

      const messageId = await queue.send({ body: { data: 'test' } })

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('test-queue', { durable: true })
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        'test-queue',
        expect.any(Buffer),
        expect.objectContaining({
          messageId: expect.any(String),
          persistent: true,
        }),
      )
      expect(messageId).toBeDefined()
    })

    it('should send a message with provided ID', async () => {
      const queue = createQueue(mockChannel as unknown as Channel, 'test-queue')

      const messageId = await queue.send({
        id: 'custom-id',
        body: { data: 'test' },
      })

      expect(messageId).toBe('custom-id')
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        'test-queue',
        expect.any(Buffer),
        expect.objectContaining({ messageId: 'custom-id' }),
      )
    })

    it('should send a message with attributes', async () => {
      const queue = createQueue(mockChannel as unknown as Channel, 'test-queue')

      await queue.send({
        body: { data: 'test' },
        attributes: { type: 'notification', priority: 1 },
      })

      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        'test-queue',
        expect.any(Buffer),
        expect.objectContaining({
          headers: { type: 'notification', priority: 1 },
        }),
      )
    })

    it('should send a message with delay', async () => {
      const queue = createQueue(mockChannel as unknown as Channel, 'test-queue')

      await queue.send({
        body: { data: 'test' },
        delaySeconds: 30,
      })

      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        'test-queue',
        expect.any(Buffer),
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-delay': 30000 }),
        }),
      )
    })

    it('should serialize message body as JSON', async () => {
      const queue = createQueue(mockChannel as unknown as Channel, 'test-queue')
      const body = { name: 'test', value: 123, nested: { key: 'value' } }

      await queue.send({ body })

      const sentBuffer = mockChannel.sendToQueue.mock.calls[0][1]
      expect(JSON.parse(sentBuffer.toString())).toEqual(body)
    })
  })

  describe('queue.sendBatch', () => {
    it('should send multiple messages', async () => {
      const queue = createQueue(mockChannel as unknown as Channel, 'test-queue')

      const ids = await queue.sendBatch([
        { body: { data: 'msg1' } },
        { body: { data: 'msg2' } },
        { body: { data: 'msg3' } },
      ])

      expect(ids).toHaveLength(3)
      expect(mockChannel.sendToQueue).toHaveBeenCalledTimes(3)
    })

    it('should return message IDs in order', async () => {
      const queue = createQueue(mockChannel as unknown as Channel, 'test-queue')

      const ids = await queue.sendBatch([
        { id: 'id-1', body: { data: 'msg1' } },
        { id: 'id-2', body: { data: 'msg2' } },
      ])

      expect(ids).toEqual(['id-1', 'id-2'])
    })
  })

  describe('queue.receive', () => {
    it('should receive messages from queue', async () => {
      const mockMessage = {
        content: Buffer.from(JSON.stringify({ data: 'test' })),
        properties: { messageId: 'msg-1', headers: {} },
        fields: { deliveryTag: 1 },
      }
      mockChannel.get.mockResolvedValueOnce(mockMessage).mockResolvedValue(false)

      const queue = createQueue(mockChannel as unknown as Channel, 'test-queue')
      const messages = await queue.receive()

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('test-queue', { durable: true })
      expect(mockChannel.get).toHaveBeenCalledWith('test-queue', { noAck: false })
      expect(messages).toHaveLength(1)
      expect(messages[0].body).toEqual({ data: 'test' })
      expect(messages[0].id).toBe('msg-1')
    })

    it('should respect maxMessages option', async () => {
      const createMockMessage = (
        id: number,
      ): {
        content: Buffer
        properties: { messageId: string; headers: Record<string, never> }
        fields: { deliveryTag: number }
      } => ({
        content: Buffer.from(JSON.stringify({ data: `test-${id}` })),
        properties: { messageId: `msg-${id}`, headers: {} },
        fields: { deliveryTag: id },
      })

      mockChannel.get
        .mockResolvedValueOnce(createMockMessage(1))
        .mockResolvedValueOnce(createMockMessage(2))
        .mockResolvedValueOnce(createMockMessage(3))
        .mockResolvedValue(false)

      const queue = createQueue(mockChannel as unknown as Channel, 'test-queue')
      const messages = await queue.receive({ maxMessages: 2 })

      expect(messages).toHaveLength(2)
      expect(mockChannel.get).toHaveBeenCalledTimes(2)
    })

    it('should return empty array when no messages', async () => {
      mockChannel.get.mockResolvedValue(false)

      const queue = createQueue(mockChannel as unknown as Channel, 'test-queue')
      const messages = await queue.receive()

      expect(messages).toEqual([])
    })

    it('should handle non-JSON message body', async () => {
      const mockMessage = {
        content: Buffer.from('plain text message'),
        properties: { messageId: 'msg-1', headers: {} },
        fields: { deliveryTag: 1 },
      }
      mockChannel.get.mockResolvedValueOnce(mockMessage).mockResolvedValue(false)

      const queue = createQueue(mockChannel as unknown as Channel, 'test-queue')
      const messages = await queue.receive()

      expect(messages[0].body).toBe('plain text message')
    })
  })

  describe('queue.subscribe', () => {
    it('should subscribe to messages', async () => {
      const queue = createQueue(mockChannel as unknown as Channel, 'test-queue')
      const handler = vi.fn()

      const unsubscribe = queue.subscribe(handler)

      // Wait for async setup
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('test-queue', { durable: true })
      expect(mockChannel.consume).toHaveBeenCalledWith('test-queue', expect.any(Function), {
        noAck: false,
      })
      expect(unsubscribe).toBeInstanceOf(Function)
    })

    it('should set prefetch when maxMessages is provided', async () => {
      const queue = createQueue(mockChannel as unknown as Channel, 'test-queue')

      queue.subscribe(vi.fn(), { maxMessages: 5 })

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockChannel.prefetch).toHaveBeenCalledWith(5)
    })

    it('should process incoming messages through handler', async () => {
      let messageHandler: ((msg: ConsumeMessage | null) => Promise<void>) | null = null
      mockChannel.consume.mockImplementation(async (_queue, handler) => {
        messageHandler = handler
        return { consumerTag: 'test-consumer' }
      })

      const queue = createQueue(mockChannel as unknown as Channel, 'test-queue')
      const handler = vi.fn()

      queue.subscribe(handler)

      await new Promise((resolve) => setTimeout(resolve, 10))

      // Simulate incoming message
      const mockMessage = {
        content: Buffer.from(JSON.stringify({ data: 'test' })),
        properties: { messageId: 'msg-1', headers: {} },
        fields: { deliveryTag: 1 },
      } as unknown as ConsumeMessage

      await messageHandler!(mockMessage)

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'msg-1',
          body: { data: 'test' },
        }),
      )
    })

    it('should nack message on handler error', async () => {
      let messageHandler: ((msg: ConsumeMessage | null) => Promise<void>) | null = null
      mockChannel.consume.mockImplementation(async (_queue, handler) => {
        messageHandler = handler
        return { consumerTag: 'test-consumer' }
      })

      const queue = createQueue(mockChannel as unknown as Channel, 'test-queue')
      const handler = vi.fn().mockRejectedValue(new Error('Handler failed'))

      queue.subscribe(handler)

      await new Promise((resolve) => setTimeout(resolve, 10))

      const mockMessage = {
        content: Buffer.from(JSON.stringify({ data: 'test' })),
        properties: { messageId: 'msg-1', headers: {} },
        fields: { deliveryTag: 1 },
      } as unknown as ConsumeMessage

      await messageHandler!(mockMessage)

      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false)
    })

    it('should ignore null messages', async () => {
      let messageHandler: ((msg: ConsumeMessage | null) => Promise<void>) | null = null
      mockChannel.consume.mockImplementation(async (_queue, handler) => {
        messageHandler = handler
        return { consumerTag: 'test-consumer' }
      })

      const queue = createQueue(mockChannel as unknown as Channel, 'test-queue')
      const handler = vi.fn()

      queue.subscribe(handler)

      await new Promise((resolve) => setTimeout(resolve, 10))

      await messageHandler!(null)

      expect(handler).not.toHaveBeenCalled()
    })

    it('should unsubscribe when unsubscribe function is called', async () => {
      const queue = createQueue(mockChannel as unknown as Channel, 'test-queue')

      const unsubscribe = queue.subscribe(vi.fn())

      await new Promise((resolve) => setTimeout(resolve, 10))

      unsubscribe()

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockChannel.cancel).toHaveBeenCalledWith('test-consumer-tag')
    })
  })

  describe('queue.size', () => {
    it('should return message count', async () => {
      mockChannel.assertQueue.mockResolvedValue({ messageCount: 42, consumerCount: 2 })

      const queue = createQueue(mockChannel as unknown as Channel, 'test-queue')
      const size = await queue.size()

      expect(size).toBe(42)
    })
  })

  describe('queue.purge', () => {
    it('should purge all messages from queue', async () => {
      const queue = createQueue(mockChannel as unknown as Channel, 'test-queue')
      await queue.purge()

      expect(mockChannel.purgeQueue).toHaveBeenCalledWith('test-queue')
    })
  })
})

describe('createReceivedMessage', () => {
  let mockChannel: {
    ack: Mock
    nack: Mock
  }

  beforeEach(() => {
    mockChannel = {
      ack: vi.fn(),
      nack: vi.fn(),
    }
  })

  it('should create a received message from ConsumeMessage', () => {
    const mockMsg: ConsumeMessage = {
      content: Buffer.from(JSON.stringify({ data: 'test' })),
      properties: {
        messageId: 'msg-123',
        headers: { type: 'notification' },
        timestamp: 1700000000,
      },
      fields: {
        deliveryTag: 456,
        redelivered: false,
        exchange: '',
        routingKey: 'test-queue',
        consumerTag: 'consumer-1',
      },
    } as unknown as ConsumeMessage

    const received = createReceivedMessage(mockChannel as unknown as Channel, mockMsg)

    expect(received.id).toBe('msg-123')
    expect(received.body).toEqual({ data: 'test' })
    expect(received.receiptHandle).toBe('456')
    expect(received.attributes).toEqual({ type: 'notification' })
    expect(received.receiveCount).toBe(1)
    expect(received.sentTimestamp).toEqual(new Date(1700000000))
  })

  it('should use deliveryTag as ID when messageId is missing', () => {
    const mockMsg: ConsumeMessage = {
      content: Buffer.from(JSON.stringify({ data: 'test' })),
      properties: { headers: {} },
      fields: { deliveryTag: 789 },
    } as unknown as ConsumeMessage

    const received = createReceivedMessage(mockChannel as unknown as Channel, mockMsg)

    expect(received.id).toBe('789')
  })

  it('should extract receive count from x-death header', () => {
    const mockMsg: ConsumeMessage = {
      content: Buffer.from(JSON.stringify({ data: 'test' })),
      properties: {
        messageId: 'msg-123',
        headers: { 'x-death': [{ count: 3 }] },
      },
      fields: { deliveryTag: 1 },
    } as unknown as ConsumeMessage

    const received = createReceivedMessage(mockChannel as unknown as Channel, mockMsg)

    expect(received.receiveCount).toBe(3)
  })

  it('should ack message', async () => {
    const mockMsg: ConsumeMessage = {
      content: Buffer.from(JSON.stringify({ data: 'test' })),
      properties: { messageId: 'msg-123', headers: {} },
      fields: { deliveryTag: 1 },
    } as unknown as ConsumeMessage

    const received = createReceivedMessage(mockChannel as unknown as Channel, mockMsg)
    await received.ack()

    expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg)
  })

  it('should nack message with requeue', async () => {
    const mockMsg: ConsumeMessage = {
      content: Buffer.from(JSON.stringify({ data: 'test' })),
      properties: { messageId: 'msg-123', headers: {} },
      fields: { deliveryTag: 1 },
    } as unknown as ConsumeMessage

    const received = createReceivedMessage(mockChannel as unknown as Channel, mockMsg)
    await received.nack()

    expect(mockChannel.nack).toHaveBeenCalledWith(mockMsg, false, true)
  })
})

describe('createReceivedMessageFromGet', () => {
  let mockChannel: {
    ack: Mock
    nack: Mock
  }

  beforeEach(() => {
    mockChannel = {
      ack: vi.fn(),
      nack: vi.fn(),
    }
  })

  it('should create a received message from GetMessage', () => {
    const mockMsg: GetMessage = {
      content: Buffer.from(JSON.stringify({ data: 'test' })),
      properties: {
        messageId: 'msg-123',
        headers: { priority: 'high' },
        timestamp: 1700000000,
      },
      fields: {
        deliveryTag: 456,
        redelivered: false,
        exchange: '',
        routingKey: 'test-queue',
        messageCount: 10,
      },
    } as unknown as GetMessage

    const received = createReceivedMessageFromGet(mockChannel as unknown as Channel, mockMsg)

    expect(received.id).toBe('msg-123')
    expect(received.body).toEqual({ data: 'test' })
    expect(received.receiptHandle).toBe('456')
    expect(received.attributes).toEqual({ priority: 'high' })
  })

  it('should handle non-JSON content', () => {
    const mockMsg: GetMessage = {
      content: Buffer.from('plain text'),
      properties: { messageId: 'msg-123', headers: {} },
      fields: { deliveryTag: 1 },
    } as unknown as GetMessage

    const received = createReceivedMessageFromGet<string>(
      mockChannel as unknown as Channel,
      mockMsg,
    )

    expect(received.body).toBe('plain text')
  })

  it('should ack message', async () => {
    const mockMsg: GetMessage = {
      content: Buffer.from(JSON.stringify({ data: 'test' })),
      properties: { messageId: 'msg-123', headers: {} },
      fields: { deliveryTag: 1 },
    } as unknown as GetMessage

    const received = createReceivedMessageFromGet(mockChannel as unknown as Channel, mockMsg)
    await received.ack()

    expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg)
  })

  it('should nack message with requeue', async () => {
    const mockMsg: GetMessage = {
      content: Buffer.from(JSON.stringify({ data: 'test' })),
      properties: { messageId: 'msg-123', headers: {} },
      fields: { deliveryTag: 1 },
    } as unknown as GetMessage

    const received = createReceivedMessageFromGet(mockChannel as unknown as Channel, mockMsg)
    await received.nack()

    expect(mockChannel.nack).toHaveBeenCalledWith(mockMsg, false, true)
  })
})

describe('Type exports', () => {
  it('should export all expected types', async () => {
    const mod = await import('../index.js')

    expect(mod.createProvider).toBeDefined()
    expect(mod.connect).toBeDefined()
  })
})

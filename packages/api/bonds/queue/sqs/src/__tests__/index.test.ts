import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
// Mock the AWS SDK SQS client
vi.mock('@aws-sdk/client-sqs', () => {
  const mockSend = vi.fn()
  const mockDestroy = vi.fn()

  return {
    SQSClient: vi.fn(function () {
      return {
        send: mockSend,
        destroy: mockDestroy,
      }
    }),
    GetQueueUrlCommand: vi.fn(function (input: unknown) {
      return { input, _type: 'GetQueueUrlCommand' }
    }),
    CreateQueueCommand: vi.fn(function (input: unknown) {
      return { input, _type: 'CreateQueueCommand' }
    }),
    DeleteQueueCommand: vi.fn(function (input: unknown) {
      return { input, _type: 'DeleteQueueCommand' }
    }),
    GetQueueAttributesCommand: vi.fn(function (input: unknown) {
      return { input, _type: 'GetQueueAttributesCommand' }
    }),
    ListQueuesCommand: vi.fn(function (input: unknown) {
      return { input, _type: 'ListQueuesCommand' }
    }),
    SendMessageCommand: vi.fn(function (input: unknown) {
      return { input, _type: 'SendMessageCommand' }
    }),
    SendMessageBatchCommand: vi.fn(function (input: unknown) {
      return { input, _type: 'SendMessageBatchCommand' }
    }),
    ReceiveMessageCommand: vi.fn(function (input: unknown) {
      return { input, _type: 'ReceiveMessageCommand' }
    }),
    DeleteMessageCommand: vi.fn(function (input: unknown) {
      return { input, _type: 'DeleteMessageCommand' }
    }),
    PurgeQueueCommand: vi.fn(function (input: unknown) {
      return { input, _type: 'PurgeQueueCommand' }
    }),
  }
})

import { SQSClient } from '@aws-sdk/client-sqs'

import type { MessageHandler, QueueMessage } from '@molecule/api-queue'

import type { createLazyQueue as CreateLazyQueueFn } from '../lazy-queue.js'
import type { createProvider as CreateProviderFn } from '../provider.js'
import type { createReceivedMessage as CreateReceivedMessageFn } from '../queue.js'

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() }

interface MockCommand {
  _type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: Record<string, any>
}

describe('@molecule/api-queue-sqs', () => {
  let createProvider: typeof CreateProviderFn
  let createReceivedMessage: typeof CreateReceivedMessageFn
  let createLazyQueue: typeof CreateLazyQueueFn
  let mockSend: Mock
  let mockDestroy: Mock

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    const { bond } = await import('@molecule/api-bond')
    bond('logger', mockLogger)

    // Get a fresh instance of the mocked client
    const mockClient = new SQSClient({})
    mockSend = mockClient.send as Mock
    mockDestroy = mockClient.destroy as Mock

    // Set up default mock responses
    mockSend.mockImplementation(async (command: MockCommand) => {
      switch (command._type) {
        case 'GetQueueUrlCommand':
          return {
            QueueUrl: `https://sqs.us-east-1.amazonaws.com/123456789012/${command.input.QueueName}`,
          }
        case 'CreateQueueCommand':
          return {
            QueueUrl: `https://sqs.us-east-1.amazonaws.com/123456789012/${command.input.QueueName}`,
          }
        case 'DeleteQueueCommand':
          return {}
        case 'GetQueueAttributesCommand':
          return {
            Attributes: {
              QueueArn: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
              ApproximateNumberOfMessages: '5',
            },
          }
        case 'ListQueuesCommand':
          return {
            QueueUrls: [
              'https://sqs.us-east-1.amazonaws.com/123456789012/queue-1',
              'https://sqs.us-east-1.amazonaws.com/123456789012/queue-2',
            ],
          }
        case 'SendMessageCommand':
          return { MessageId: 'msg-123' }
        case 'SendMessageBatchCommand':
          return {
            Successful: command.input.Entries.map((e: Record<string, string>, i: number) => ({
              Id: e.Id,
              MessageId: `msg-batch-${i}`,
            })),
          }
        case 'ReceiveMessageCommand':
          return { Messages: [] }
        case 'DeleteMessageCommand':
          return {}
        case 'PurgeQueueCommand':
          return {}
        default:
          return {}
      }
    })

    // Import after mocking
    const providerModule = await import('../provider.js')
    createProvider = providerModule.createProvider

    const queueModule = await import('../queue.js')
    createReceivedMessage = queueModule.createReceivedMessage

    const lazyQueueModule = await import('../lazy-queue.js')
    createLazyQueue = lazyQueueModule.createLazyQueue
  })

  afterEach(async () => {
    const { unbond } = await import('@molecule/api-bond')
    unbond('logger')
    vi.clearAllMocks()
  })

  describe('createProvider', () => {
    it('should create a provider with default options', () => {
      const providerInstance = createProvider()

      expect(providerInstance).toBeDefined()
      expect(typeof providerInstance.queue).toBe('function')
      expect(typeof providerInstance.listQueues).toBe('function')
      expect(typeof providerInstance.createQueue).toBe('function')
      expect(typeof providerInstance.deleteQueue).toBe('function')
      expect(typeof providerInstance.close).toBe('function')
    })

    it('should create a provider with custom region', () => {
      const providerInstance = createProvider({ region: 'eu-west-1' })

      expect(providerInstance).toBeDefined()
      expect(SQSClient).toHaveBeenCalledWith(expect.objectContaining({ region: 'eu-west-1' }))
    })

    it('should create a provider with custom credentials', () => {
      const providerInstance = createProvider({
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      })

      expect(providerInstance).toBeDefined()
      expect(SQSClient).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: {
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
            secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          },
        }),
      )
    })

    it('should create a provider with custom endpoint', () => {
      const providerInstance = createProvider({
        endpoint: 'http://localhost:4566',
      })

      expect(providerInstance).toBeDefined()
      expect(SQSClient).toHaveBeenCalledWith(
        expect.objectContaining({ endpoint: 'http://localhost:4566' }),
      )
    })

    it('should use environment variables when options are not provided', () => {
      const originalEnv = { ...process.env }
      process.env.AWS_REGION = 'ap-southeast-1'
      process.env.SQS_ENDPOINT = 'http://localstack:4566'

      // Need to reimport to pick up env vars
      vi.resetModules()

      const providerInstance = createProvider()

      expect(providerInstance).toBeDefined()

      // Restore env
      process.env = originalEnv
    })

    it('should prefer options over environment variables', () => {
      const originalEnv = { ...process.env }
      process.env.AWS_REGION = 'ap-southeast-1'

      const providerInstance = createProvider({ region: 'eu-central-1' })

      expect(providerInstance).toBeDefined()
      expect(SQSClient).toHaveBeenCalledWith(expect.objectContaining({ region: 'eu-central-1' }))

      // Restore env
      process.env = originalEnv
    })

    it('should default to us-east-1 region', () => {
      const originalEnv = { ...process.env }
      delete process.env.AWS_REGION

      const providerInstance = createProvider()

      expect(providerInstance).toBeDefined()
      expect(SQSClient).toHaveBeenCalledWith(expect.objectContaining({ region: 'us-east-1' }))

      // Restore env
      process.env = originalEnv
    })
  })

  describe('provider.queue', () => {
    it('should return a queue instance', () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('test-queue')

      expect(queue).toBeDefined()
      expect(queue.name).toBe('test-queue')
    })

    it('should return the same queue instance for the same name', () => {
      const providerInstance = createProvider()
      const queue1 = providerInstance.queue('test-queue')
      const queue2 = providerInstance.queue('test-queue')

      expect(queue1).toBe(queue2)
    })

    it('should return different queue instances for different names', () => {
      const providerInstance = createProvider()
      const queue1 = providerInstance.queue('queue-1')
      const queue2 = providerInstance.queue('queue-2')

      expect(queue1).not.toBe(queue2)
      expect(queue1.name).toBe('queue-1')
      expect(queue2.name).toBe('queue-2')
    })
  })

  describe('provider.listQueues', () => {
    it('should return list of queue names', async () => {
      const providerInstance = createProvider()
      const queues = await providerInstance.listQueues!()

      expect(queues).toEqual(['queue-1', 'queue-2'])
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ _type: 'ListQueuesCommand' }))
    })

    it('should return empty array when no queues exist', async () => {
      mockSend.mockImplementationOnce(async () => ({ QueueUrls: undefined }))

      const providerInstance = createProvider()
      const queues = await providerInstance.listQueues!()

      expect(queues).toEqual([])
    })

    it('should extract queue names from URLs', async () => {
      mockSend.mockImplementationOnce(async () => ({
        QueueUrls: [
          'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
          'https://sqs.us-west-2.amazonaws.com/987654321098/another-queue',
        ],
      }))

      const providerInstance = createProvider()
      const queues = await providerInstance.listQueues!()

      expect(queues).toEqual(['my-queue', 'another-queue'])
    })
  })

  describe('provider.createQueue', () => {
    it('should create a new queue', async () => {
      const providerInstance = createProvider()
      const queue = await providerInstance.createQueue!('new-queue')

      expect(queue).toBeDefined()
      expect(queue.name).toBe('new-queue')
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'CreateQueueCommand',
          input: expect.objectContaining({ QueueName: 'new-queue' }),
        }),
      )
    })

    it('should create queue with visibility timeout', async () => {
      const providerInstance = createProvider()
      await providerInstance.createQueue!('timeout-queue', {
        visibilityTimeout: 60,
      })

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'CreateQueueCommand',
          input: expect.objectContaining({
            Attributes: expect.objectContaining({
              VisibilityTimeout: '60',
            }),
          }),
        }),
      )
    })

    it('should create queue with message retention', async () => {
      const providerInstance = createProvider()
      await providerInstance.createQueue!('retention-queue', {
        messageRetentionSeconds: 86400,
      })

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'CreateQueueCommand',
          input: expect.objectContaining({
            Attributes: expect.objectContaining({
              MessageRetentionPeriod: '86400',
            }),
          }),
        }),
      )
    })

    it('should create queue with max message size', async () => {
      const providerInstance = createProvider()
      await providerInstance.createQueue!('size-queue', {
        maxMessageSize: 262144,
      })

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'CreateQueueCommand',
          input: expect.objectContaining({
            Attributes: expect.objectContaining({
              MaximumMessageSize: '262144',
            }),
          }),
        }),
      )
    })

    it('should create FIFO queue with .fifo suffix', async () => {
      const providerInstance = createProvider()
      await providerInstance.createQueue!('fifo-queue', { fifo: true })

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'CreateQueueCommand',
          input: expect.objectContaining({ QueueName: 'fifo-queue.fifo' }),
        }),
      )
    })

    it('should create queue with dead letter queue', async () => {
      const providerInstance = createProvider()
      await providerInstance.createQueue!('main-queue', {
        deadLetterQueue: { name: 'dlq', maxReceiveCount: 3 },
      })

      // Should first get DLQ URL
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'GetQueueUrlCommand',
          input: { QueueName: 'dlq' },
        }),
      )

      // Should get DLQ ARN
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'GetQueueAttributesCommand',
        }),
      )

      // Should create queue with RedrivePolicy
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'CreateQueueCommand',
          input: expect.objectContaining({
            Attributes: expect.objectContaining({
              RedrivePolicy: expect.stringContaining('maxReceiveCount'),
            }),
          }),
        }),
      )
    })
  })

  describe('provider.deleteQueue', () => {
    it('should delete a queue', async () => {
      const providerInstance = createProvider()
      await providerInstance.deleteQueue!('delete-me')

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'DeleteQueueCommand',
          input: expect.objectContaining({
            QueueUrl: expect.stringContaining('delete-me'),
          }),
        }),
      )
    })

    it('should remove queue from cache after deletion', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('to-delete')
      await providerInstance.deleteQueue!('to-delete')

      // Getting queue again should create a new instance
      const newQueue = providerInstance.queue('to-delete')
      expect(newQueue).not.toBe(queue)
    })
  })

  describe('provider.close', () => {
    it('should destroy the SQS client', async () => {
      const providerInstance = createProvider()
      await providerInstance.close!()

      expect(mockDestroy).toHaveBeenCalled()
    })
  })

  describe('queue.send', () => {
    it('should send a message and return message ID', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('send-queue')

      const messageId = await queue.send({ body: { test: 'data' } })

      expect(messageId).toBe('msg-123')
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'SendMessageCommand',
          input: expect.objectContaining({
            MessageBody: JSON.stringify({ test: 'data' }),
          }),
        }),
      )
    })

    it('should send a message with custom ID', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('custom-id-queue')

      const message: QueueMessage<{ data: string }> = {
        body: { data: 'test' },
        id: 'custom-message-id',
      }

      await queue.send(message)

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'SendMessageCommand',
          input: expect.objectContaining({
            MessageDeduplicationId: 'custom-message-id',
          }),
        }),
      )
    })

    it('should send a message with delay', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('delayed-queue')

      const message: QueueMessage<string> = {
        body: 'delayed message',
        delaySeconds: 30,
      }

      await queue.send(message)

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'SendMessageCommand',
          input: expect.objectContaining({
            DelaySeconds: 30,
          }),
        }),
      )
    })

    it('should send a message with attributes', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('attrs-queue')

      const message: QueueMessage<string> = {
        body: 'test',
        attributes: { type: 'notification', priority: 1 },
      }

      await queue.send(message)

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'SendMessageCommand',
          input: expect.objectContaining({
            MessageAttributes: {
              type: { DataType: 'String', StringValue: 'notification' },
              priority: { DataType: 'Number', StringValue: '1' },
            },
          }),
        }),
      )
    })

    it('should send a message with group ID (FIFO)', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('fifo-queue')

      const message: QueueMessage<string> = {
        body: 'fifo message',
        groupId: 'group-1',
      }

      await queue.send(message)

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'SendMessageCommand',
          input: expect.objectContaining({
            MessageGroupId: 'group-1',
          }),
        }),
      )
    })

    it('should send a message with deduplication ID (FIFO)', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('fifo-queue')

      const message: QueueMessage<string> = {
        body: 'fifo message',
        deduplicationId: 'dedup-123',
      }

      await queue.send(message)

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'SendMessageCommand',
          input: expect.objectContaining({
            MessageDeduplicationId: 'dedup-123',
          }),
        }),
      )
    })
  })

  describe('queue.sendBatch', () => {
    it('should send multiple messages', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('batch-queue')

      const messages: QueueMessage<string>[] = [
        { body: 'message 1' },
        { body: 'message 2' },
        { body: 'message 3' },
      ]

      const ids = await queue.sendBatch!(messages)

      expect(ids).toHaveLength(3)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'SendMessageBatchCommand',
          input: expect.objectContaining({
            Entries: expect.arrayContaining([
              expect.objectContaining({ MessageBody: '"message 1"' }),
              expect.objectContaining({ MessageBody: '"message 2"' }),
              expect.objectContaining({ MessageBody: '"message 3"' }),
            ]),
          }),
        }),
      )
    })

    it('should batch messages in groups of 10 (SQS limit)', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('large-batch-queue')

      // Create 15 messages
      const messages: QueueMessage<string>[] = Array.from({ length: 15 }, (_, i) => ({
        body: `message ${i + 1}`,
      }))

      await queue.sendBatch!(messages)

      // Should be called twice (10 + 5)
      const batchCalls = mockSend.mock.calls.filter(
        (call) => call[0]._type === 'SendMessageBatchCommand',
      )
      expect(batchCalls).toHaveLength(2)
      expect(batchCalls[0][0].input.Entries).toHaveLength(10)
      expect(batchCalls[1][0].input.Entries).toHaveLength(5)
    })

    it('should send batch with individual message attributes', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('batch-attrs-queue')

      const messages: QueueMessage<string>[] = [
        { body: 'msg 1', attributes: { type: 'a' } },
        { body: 'msg 2', attributes: { type: 'b' } },
      ]

      await queue.sendBatch!(messages)

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'SendMessageBatchCommand',
          input: expect.objectContaining({
            Entries: expect.arrayContaining([
              expect.objectContaining({
                MessageAttributes: { type: { DataType: 'String', StringValue: 'a' } },
              }),
              expect.objectContaining({
                MessageAttributes: { type: { DataType: 'String', StringValue: 'b' } },
              }),
            ]),
          }),
        }),
      )
    })
  })

  describe('queue.receive', () => {
    it('should receive messages from the queue', async () => {
      mockSend.mockImplementation(async (command: MockCommand) => {
        if (command._type === 'GetQueueUrlCommand') {
          return { QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/receive-queue' }
        }
        if (command._type === 'ReceiveMessageCommand') {
          return {
            Messages: [
              {
                MessageId: 'msg-1',
                Body: JSON.stringify({ data: 'test' }),
                ReceiptHandle: 'receipt-1',
                MessageAttributes: {},
                Attributes: {
                  ApproximateReceiveCount: '1',
                  SentTimestamp: '1700000000000',
                },
              },
            ],
          }
        }
        return {}
      })

      const providerInstance = createProvider()
      const queue = providerInstance.queue('receive-queue')

      const messages = await queue.receive()

      expect(messages).toHaveLength(1)
      expect(messages[0].id).toBe('msg-1')
      expect(messages[0].body).toEqual({ data: 'test' })
      expect(messages[0].receiptHandle).toBe('receipt-1')
      expect(messages[0].receiveCount).toBe(1)
    })

    it('should receive with default maxMessages of 10', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('receive-default-queue')

      await queue.receive()

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'ReceiveMessageCommand',
          input: expect.objectContaining({
            MaxNumberOfMessages: 10,
          }),
        }),
      )
    })

    it('should receive with custom maxMessages', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('receive-custom-queue')

      await queue.receive({ maxMessages: 5 })

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'ReceiveMessageCommand',
          input: expect.objectContaining({
            MaxNumberOfMessages: 5,
          }),
        }),
      )
    })

    it('should cap maxMessages at 10 (SQS limit)', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('receive-max-queue')

      await queue.receive({ maxMessages: 20 })

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'ReceiveMessageCommand',
          input: expect.objectContaining({
            MaxNumberOfMessages: 10,
          }),
        }),
      )
    })

    it('should receive with visibility timeout', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('visibility-queue')

      await queue.receive({ visibilityTimeout: 60 })

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'ReceiveMessageCommand',
          input: expect.objectContaining({
            VisibilityTimeout: 60,
          }),
        }),
      )
    })

    it('should receive with long polling', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('long-poll-queue')

      await queue.receive({ waitTimeSeconds: 20 })

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'ReceiveMessageCommand',
          input: expect.objectContaining({
            WaitTimeSeconds: 20,
          }),
        }),
      )
    })

    it('should return empty array when no messages', async () => {
      mockSend.mockImplementation(async (command: MockCommand) => {
        if (command._type === 'GetQueueUrlCommand') {
          return { QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/empty-queue' }
        }
        if (command._type === 'ReceiveMessageCommand') {
          return { Messages: undefined }
        }
        return {}
      })

      const providerInstance = createProvider()
      const queue = providerInstance.queue('empty-queue')

      const messages = await queue.receive()

      expect(messages).toEqual([])
    })
  })

  describe('queue.subscribe', () => {
    it('should subscribe to messages', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('subscribe-queue')

      const handler: MessageHandler<string> = vi.fn()
      const unsubscribe = queue.subscribe(handler)

      expect(typeof unsubscribe).toBe('function')

      // Cleanup
      unsubscribe()
    })

    it('should return unsubscribe function that stops polling', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('unsubscribe-queue')

      const handler: MessageHandler<string> = vi.fn()
      const unsubscribe = queue.subscribe(handler)

      // Unsubscribe immediately
      unsubscribe()

      // Handler should not be called
      expect(handler).not.toHaveBeenCalled()
    })

    it('should use long polling by default (20 seconds)', async () => {
      mockSend.mockImplementation(async (command: MockCommand) => {
        if (command._type === 'GetQueueUrlCommand') {
          return { QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/poll-queue' }
        }
        if (command._type === 'ReceiveMessageCommand') {
          // Verify long polling is set
          expect(command.input.WaitTimeSeconds).toBe(20)
          return { Messages: [] }
        }
        return {}
      })

      const providerInstance = createProvider()
      const queue = providerInstance.queue('poll-queue')

      const handler: MessageHandler<string> = vi.fn()
      const unsubscribe = queue.subscribe(handler)

      // Wait a bit for polling to start
      await new Promise((resolve) => setTimeout(resolve, 50))

      unsubscribe()
    })
  })

  describe('queue.size', () => {
    it('should return the approximate number of messages', async () => {
      mockSend.mockImplementation(async (command: MockCommand) => {
        if (command._type === 'GetQueueUrlCommand') {
          return { QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/size-queue' }
        }
        if (command._type === 'GetQueueAttributesCommand') {
          return {
            Attributes: {
              ApproximateNumberOfMessages: '42',
            },
          }
        }
        return {}
      })

      const providerInstance = createProvider()
      const queue = providerInstance.queue('size-queue')

      const size = await queue.size!()

      expect(size).toBe(42)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'GetQueueAttributesCommand',
          input: expect.objectContaining({
            AttributeNames: ['ApproximateNumberOfMessages'],
          }),
        }),
      )
    })

    it('should return 0 when attribute is missing', async () => {
      mockSend.mockImplementation(async (command: MockCommand) => {
        if (command._type === 'GetQueueUrlCommand') {
          return { QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/empty-size-queue' }
        }
        if (command._type === 'GetQueueAttributesCommand') {
          return { Attributes: {} }
        }
        return {}
      })

      const providerInstance = createProvider()
      const queue = providerInstance.queue('empty-size-queue')

      const size = await queue.size!()

      expect(size).toBe(0)
    })
  })

  describe('queue.purge', () => {
    it('should purge all messages from the queue', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('purge-queue')

      await queue.purge!()

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'PurgeQueueCommand',
        }),
      )
    })
  })

  describe('createReceivedMessage', () => {
    it('should create a ReceivedMessage from SQS message', async () => {
      const mockClient = new SQSClient({})
      const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue'
      const msg = {
        MessageId: 'msg-123',
        Body: JSON.stringify({ data: 'test-data' }),
        ReceiptHandle: 'receipt-handle-123',
        MessageAttributes: {
          type: { StringValue: 'notification' },
          priority: { StringValue: '1' },
        },
        Attributes: {
          ApproximateReceiveCount: '2',
          SentTimestamp: '1700000000000',
        },
      }

      const receivedMessage = createReceivedMessage(mockClient, queueUrl, msg)

      expect(receivedMessage.id).toBe('msg-123')
      expect(receivedMessage.body).toEqual({ data: 'test-data' })
      expect(receivedMessage.receiptHandle).toBe('receipt-handle-123')
      expect(receivedMessage.attributes).toEqual({ type: 'notification', priority: '1' })
      expect(receivedMessage.receiveCount).toBe(2)
      expect(receivedMessage.sentTimestamp).toBeInstanceOf(Date)
      expect(receivedMessage.sentTimestamp?.getTime()).toBe(1700000000000)
    })

    it('should handle message without attributes', async () => {
      const mockClient = new SQSClient({})
      const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue'
      const msg = {
        MessageId: 'msg-456',
        Body: JSON.stringify({ data: 'test' }),
        ReceiptHandle: 'receipt-456',
      }

      const receivedMessage = createReceivedMessage(mockClient, queueUrl, msg)

      expect(receivedMessage.id).toBe('msg-456')
      expect(receivedMessage.attributes).toBeUndefined()
      expect(receivedMessage.receiveCount).toBe(1)
      expect(receivedMessage.sentTimestamp).toBeUndefined()
    })

    it('should handle non-JSON message body', async () => {
      const mockClient = new SQSClient({})
      const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue'
      const msg = {
        MessageId: 'msg-789',
        Body: 'plain text message',
        ReceiptHandle: 'receipt-789',
      }

      const receivedMessage = createReceivedMessage<string>(mockClient, queueUrl, msg)

      expect(receivedMessage.body).toBe('plain text message')
    })

    it('should handle missing message ID', async () => {
      const mockClient = new SQSClient({})
      const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue'
      const msg = {
        Body: JSON.stringify({ data: 'test' }),
        ReceiptHandle: 'receipt-000',
      }

      const receivedMessage = createReceivedMessage(mockClient, queueUrl, msg)

      expect(receivedMessage.id).toBe('')
    })

    describe('ack', () => {
      it('should delete the message when acknowledged', async () => {
        const mockClient = new SQSClient({})
        const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue'
        const msg = {
          MessageId: 'ack-msg',
          Body: JSON.stringify({ data: 'test' }),
          ReceiptHandle: 'ack-receipt',
        }

        const receivedMessage = createReceivedMessage(mockClient, queueUrl, msg)
        await receivedMessage.ack()

        expect(mockSend).toHaveBeenCalledWith(
          expect.objectContaining({
            _type: 'DeleteMessageCommand',
            input: {
              QueueUrl: queueUrl,
              ReceiptHandle: 'ack-receipt',
            },
          }),
        )
      })
    })

    describe('nack', () => {
      it('should log debug message when nacking', async () => {
        const mockClient = new SQSClient({})
        const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue'
        const msg = {
          MessageId: 'nack-msg',
          Body: JSON.stringify({ data: 'test' }),
          ReceiptHandle: 'nack-receipt',
        }

        const receivedMessage = createReceivedMessage(mockClient, queueUrl, msg)
        await receivedMessage.nack()

        // SQS doesn't have true nack - message becomes visible after timeout
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'SQS nack: message will become visible after visibility timeout',
        )
      })
    })
  })

  describe('createLazyQueue', () => {
    it('should fetch URL on first operation', async () => {
      const mockClient = new SQSClient({})
      const getUrl = vi
        .fn()
        .mockResolvedValue('https://sqs.us-east-1.amazonaws.com/123456789012/lazy-queue')

      const lazyQueue = createLazyQueue(mockClient, 'lazy-queue', getUrl)

      // URL should not be fetched yet
      expect(getUrl).not.toHaveBeenCalled()

      // Trigger an operation
      await lazyQueue.send({ body: 'test' })

      // URL should now be fetched
      expect(getUrl).toHaveBeenCalled()
    })

    it('should cache the queue after first fetch', async () => {
      const mockClient = new SQSClient({})
      const getUrl = vi
        .fn()
        .mockResolvedValue('https://sqs.us-east-1.amazonaws.com/123456789012/cached-queue')

      const lazyQueue = createLazyQueue(mockClient, 'cached-queue', getUrl)

      // Multiple operations
      await lazyQueue.send({ body: 'test1' })
      await lazyQueue.send({ body: 'test2' })
      await lazyQueue.receive()

      // URL should only be fetched once
      expect(getUrl).toHaveBeenCalledTimes(1)
    })

    it('should have correct name property', () => {
      const mockClient = new SQSClient({})
      const getUrl = vi.fn()

      const lazyQueue = createLazyQueue(mockClient, 'named-queue', getUrl)

      expect(lazyQueue.name).toBe('named-queue')
    })
  })

  describe('error handling', () => {
    it('should throw on getQueueUrl error', async () => {
      mockSend.mockImplementation(async (command: MockCommand) => {
        if (command._type === 'GetQueueUrlCommand') {
          throw new Error('Queue does not exist')
        }
        return {}
      })

      const providerInstance = createProvider()
      const queue = providerInstance.queue('non-existent-queue')

      await expect(queue.send({ body: 'test' })).rejects.toThrow('Queue does not exist')
    })

    it('should handle send errors', async () => {
      mockSend.mockImplementation(async (command: MockCommand) => {
        if (command._type === 'GetQueueUrlCommand') {
          return { QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/error-queue' }
        }
        if (command._type === 'SendMessageCommand') {
          throw new Error('Failed to send message')
        }
        return {}
      })

      const providerInstance = createProvider()
      const queue = providerInstance.queue('error-queue')

      await expect(queue.send({ body: 'test' })).rejects.toThrow('Failed to send message')
    })

    it('should handle receive errors', async () => {
      mockSend.mockImplementation(async (command: MockCommand) => {
        if (command._type === 'GetQueueUrlCommand') {
          return {
            QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/receive-error-queue',
          }
        }
        if (command._type === 'ReceiveMessageCommand') {
          throw new Error('Failed to receive messages')
        }
        return {}
      })

      const providerInstance = createProvider()
      const queue = providerInstance.queue('receive-error-queue')

      await expect(queue.receive()).rejects.toThrow('Failed to receive messages')
    })

    it('should handle size errors', async () => {
      mockSend.mockImplementation(async (command: MockCommand) => {
        if (command._type === 'GetQueueUrlCommand') {
          return { QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/size-error-queue' }
        }
        if (command._type === 'GetQueueAttributesCommand') {
          throw new Error('Failed to get attributes')
        }
        return {}
      })

      const providerInstance = createProvider()
      const queue = providerInstance.queue('size-error-queue')

      await expect(queue.size!()).rejects.toThrow('Failed to get attributes')
    })

    it('should handle purge errors', async () => {
      mockSend.mockImplementation(async (command: MockCommand) => {
        if (command._type === 'GetQueueUrlCommand') {
          return { QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/purge-error-queue' }
        }
        if (command._type === 'PurgeQueueCommand') {
          throw new Error('Failed to purge queue')
        }
        return {}
      })

      const providerInstance = createProvider()
      const queue = providerInstance.queue('purge-error-queue')

      await expect(queue.purge!()).rejects.toThrow('Failed to purge queue')
    })

    it('should handle delete queue errors', async () => {
      mockSend.mockImplementation(async (command: MockCommand) => {
        if (command._type === 'GetQueueUrlCommand') {
          return { QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/delete-error-queue' }
        }
        if (command._type === 'DeleteQueueCommand') {
          throw new Error('Failed to delete queue')
        }
        return {}
      })

      const providerInstance = createProvider()

      await expect(providerInstance.deleteQueue!('delete-error-queue')).rejects.toThrow(
        'Failed to delete queue',
      )
    })
  })

  describe('typed messages', () => {
    interface OrderMessage {
      orderId: string
      amount: number
      currency: string
    }

    interface UserEvent {
      userId: string
      action: 'login' | 'logout' | 'signup'
      timestamp: Date
    }

    it('should send and receive typed messages', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('typed-queue')

      const message: QueueMessage<OrderMessage> = {
        body: {
          orderId: 'ORD-001',
          amount: 99.99,
          currency: 'USD',
        },
      }

      await queue.send<OrderMessage>(message)

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'SendMessageCommand',
          input: expect.objectContaining({
            MessageBody: JSON.stringify(message.body),
          }),
        }),
      )
    })

    it('should subscribe with typed handler', () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('typed-subscribe-queue')

      const handler: MessageHandler<UserEvent> = vi.fn(async (message) => {
        expect(message.body.userId).toBeDefined()
        expect(message.body.action).toBeDefined()
      })

      const unsubscribe = queue.subscribe<UserEvent>(handler)

      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })
  })

  describe('default provider export', () => {
    it('should export a default provider instance', async () => {
      const module = await import('../provider.js')

      expect(module.provider).toBeDefined()
      expect(typeof module.provider.queue).toBe('function')
    })
  })

  describe('type exports', () => {
    it('should export all required types and functions', async () => {
      const module = await import('../index.js')

      expect(module).toBeDefined()
      expect(module.createProvider).toBeDefined()
      expect(module.provider).toBeDefined()
    })
  })

  describe('environment variable handling', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('should use AWS_REGION when provided', async () => {
      process.env.AWS_REGION = 'ap-northeast-1'

      vi.resetModules()
      const { createProvider: freshCreateProvider } = await import('../provider.js')

      freshCreateProvider()

      expect(SQSClient).toHaveBeenCalledWith(expect.objectContaining({ region: 'ap-northeast-1' }))
    })

    it('should use SQS_ENDPOINT when provided', async () => {
      process.env.SQS_ENDPOINT = 'http://localstack:4566'

      vi.resetModules()
      const { createProvider: freshCreateProvider } = await import('../provider.js')

      freshCreateProvider()

      expect(SQSClient).toHaveBeenCalledWith(
        expect.objectContaining({ endpoint: 'http://localstack:4566' }),
      )
    })

    it('should use default region when no env var is set', async () => {
      delete process.env.AWS_REGION

      vi.resetModules()
      const { createProvider: freshCreateProvider } = await import('../provider.js')

      freshCreateProvider()

      expect(SQSClient).toHaveBeenCalledWith(expect.objectContaining({ region: 'us-east-1' }))
    })
  })
})

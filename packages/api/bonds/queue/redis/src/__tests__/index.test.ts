import type { Job } from 'bullmq'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MessageHandler, QueueMessage, ReceiveOptions } from '@molecule/api-queue'

import type { createProvider as CreateProviderFn } from '../provider.js'
import type { createReceivedMessage as CreateReceivedMessageFn } from '../queue.js'

// Mock BullMQ
vi.mock('bullmq', () => {
  const mockJob = {
    id: 'job-123',
    data: { test: 'data' },
    opts: { attempts: 3 },
    attemptsMade: 1,
    timestamp: Date.now(),
    token: 'test-token',
    remove: vi.fn().mockResolvedValue(undefined),
    moveToFailed: vi.fn().mockResolvedValue(undefined),
  }

  const mockQueue = {
    add: vi.fn().mockResolvedValue(mockJob),
    addBulk: vi.fn().mockResolvedValue([mockJob, { ...mockJob, id: 'job-456' }]),
    getJobs: vi.fn().mockResolvedValue([mockJob]),
    getJobCounts: vi.fn().mockResolvedValue({ waiting: 5, active: 2, delayed: 1 }),
    drain: vi.fn().mockResolvedValue(undefined),
    obliterate: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  }

  const mockWorker = {
    on: vi.fn().mockReturnThis(),
    close: vi.fn().mockResolvedValue(undefined),
  }

  return {
    Queue: vi.fn(function () {
      return mockQueue
    }),
    Worker: vi.fn(function (_name: string, processor: (job: Job) => Promise<void>) {
      // Store processor for testing
      ;(mockWorker as unknown as Record<string, unknown>).__processor = processor
      return mockWorker
    }),
    Job: vi.fn(),
  }
})

describe('@molecule/api-queue-redis', () => {
  let createProvider: typeof CreateProviderFn
  let createReceivedMessage: typeof CreateReceivedMessageFn
  // eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-explicit-any
  let BullQueue: any
  // eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-explicit-any
  let Worker: any

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()

    // Import after mocking
    const providerModule = await import('../provider.js')
    createProvider = providerModule.createProvider

    const queueModule = await import('../queue.js')
    createReceivedMessage = queueModule.createReceivedMessage

    const bullmq = await import('bullmq')
    BullQueue = bullmq.Queue
    Worker = bullmq.Worker
  })

  afterEach(() => {
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

    it('registers its secret definitions at import time', async () => {
      await import('../index.js')
      const { getSecretDefinition } = await import('@molecule/api-secrets')
      expect(getSecretDefinition('REDIS_URL')).toBeDefined()
    })

    it('should create a provider with custom URL option', () => {
      const providerInstance = createProvider({
        url: 'redis://custom-host:6380',
      })

      expect(providerInstance).toBeDefined()
    })

    it('should create a provider with custom host/port/password options', () => {
      const providerInstance = createProvider({
        host: 'redis.example.com',
        port: 6380,
        password: 'secret-password',
        prefix: 'custom:prefix:',
      })

      expect(providerInstance).toBeDefined()
    })

    it('should use environment variables when options are not provided', () => {
      const originalEnv = { ...process.env }
      process.env.REDIS_HOST = 'env-host'
      process.env.REDIS_PORT = '6381'
      process.env.REDIS_PASSWORD = 'env-password'

      const providerInstance = createProvider()

      expect(providerInstance).toBeDefined()

      // Restore env
      process.env = originalEnv
    })

    it('should prefer options over environment variables', () => {
      const originalEnv = { ...process.env }
      process.env.REDIS_HOST = 'env-host'
      process.env.REDIS_PORT = '6381'

      const providerInstance = createProvider({
        host: 'option-host',
        port: 6382,
      })

      expect(providerInstance).toBeDefined()

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
    it('should return empty array when no queues exist', async () => {
      const providerInstance = createProvider()
      const queues = await providerInstance.listQueues!()

      expect(queues).toEqual([])
    })

    it('should return list of created queue names', async () => {
      const providerInstance = createProvider()
      providerInstance.queue('queue-a')
      providerInstance.queue('queue-b')
      providerInstance.queue('queue-c')

      const queues = await providerInstance.listQueues!()

      expect(queues).toContain('queue-a')
      expect(queues).toContain('queue-b')
      expect(queues).toContain('queue-c')
      expect(queues).toHaveLength(3)
    })
  })

  describe('provider.createQueue', () => {
    it('should create a new queue', async () => {
      const providerInstance = createProvider()
      const queue = await providerInstance.createQueue!('new-queue')

      expect(queue).toBeDefined()
      expect(queue.name).toBe('new-queue')
    })

    it('should create queue with options', async () => {
      const providerInstance = createProvider()
      const queue = await providerInstance.createQueue!('options-queue', {
        fifo: true,
        visibilityTimeout: 60,
      })

      expect(queue).toBeDefined()
      expect(queue.name).toBe('options-queue')
    })

    it('should return existing queue if already created', async () => {
      const providerInstance = createProvider()
      const existingQueue = providerInstance.queue('existing-queue')
      const createdQueue = await providerInstance.createQueue!('existing-queue')

      expect(createdQueue).toBe(existingQueue)
    })
  })

  describe('provider.deleteQueue', () => {
    it('should delete an existing queue', async () => {
      const providerInstance = createProvider()
      providerInstance.queue('delete-me')

      await providerInstance.deleteQueue!('delete-me')

      const queues = await providerInstance.listQueues!()
      expect(queues).not.toContain('delete-me')
    })

    it('should not throw when deleting non-existent queue', async () => {
      const providerInstance = createProvider()

      await expect(providerInstance.deleteQueue!('non-existent')).resolves.toBeUndefined()
    })

    it('should call obliterate on BullMQ queue', async () => {
      const providerInstance = createProvider()
      providerInstance.queue('to-obliterate')

      await providerInstance.deleteQueue!('to-obliterate')

      const mockBullQueue = BullQueue.mock.results[0]?.value || BullQueue.mock.results[1]?.value
      expect(mockBullQueue?.obliterate).toHaveBeenCalledWith({ force: true })
    })

    it('should close the ORIGINAL cached queue connection, not just the temporary obliterate connection (previously leaked until provider.close())', async () => {
      const providerInstance = createProvider()
      providerInstance.queue('leak-check-queue')

      await providerInstance.deleteQueue!('leak-check-queue')

      // Same mock instance is returned for every `new BullQueue(...)` call —
      // one close() for the original queue's own disposer (run + unregistered
      // by deleteQueue) plus one for the short-lived obliterate connection.
      const mockBullQueue = BullQueue.mock.results[0].value
      expect(mockBullQueue.close).toHaveBeenCalledTimes(2)
    })

    it('should unregister the deleted queue disposer so provider.close() does not double-close it', async () => {
      const providerInstance = createProvider()
      providerInstance.queue('unregister-check-queue')

      await providerInstance.deleteQueue!('unregister-check-queue')

      const mockBullQueue = BullQueue.mock.results[0].value
      mockBullQueue.close.mockClear()

      await providerInstance.close!()

      // No queue is left registered for this name — close() must not touch
      // the already-deleted queue's (already-closed) connection again.
      expect(mockBullQueue.close).not.toHaveBeenCalled()
    })
  })

  describe('provider.close', () => {
    it('should close the underlying BullMQ queues (releasing Redis connections)', async () => {
      const providerInstance = createProvider()
      providerInstance.queue('queue-1')
      providerInstance.queue('queue-2')

      await providerInstance.close!()

      // One BullQueue per created queue must actually be closed — a close()
      // that leaks connections keeps the consumer's process alive forever.
      const mockBullQueue = BullQueue.mock.results[0].value
      expect(mockBullQueue.close).toHaveBeenCalledTimes(2)
    })

    it('should close workers created by subscribe()', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('worker-close-queue')
      queue.subscribe(vi.fn())

      await providerInstance.close!()

      const mockWorker = Worker.mock.results[0].value
      expect(mockWorker.close).toHaveBeenCalled()
    })
  })

  describe('queue.send', () => {
    it('should send a message and return message ID', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('send-queue')

      const messageId = await queue.send({
        body: { test: 'data' },
      })

      expect(messageId).toBeDefined()
      expect(typeof messageId).toBe('string')
    })

    it('should send a message with custom ID', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('custom-id-queue')

      const message: QueueMessage<{ data: string }> = {
        body: { data: 'test' },
        id: 'custom-message-id',
      }

      await queue.send(message)

      const mockBullQueue = BullQueue.mock.results[0].value
      expect(mockBullQueue.add).toHaveBeenCalledWith(
        'message',
        expect.objectContaining({ __molecule_queue_envelope: 1, body: { data: 'test' } }),
        expect.objectContaining({
          jobId: 'custom-message-id',
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

      const mockBullQueue = BullQueue.mock.results[0].value
      expect(mockBullQueue.add).toHaveBeenCalledWith(
        'message',
        expect.objectContaining({ body: 'delayed message' }),
        expect.objectContaining({
          delay: 30000, // 30 seconds in milliseconds
        }),
      )
    })

    it('should send a message without delay when delaySeconds is undefined', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('no-delay-queue')

      const message: QueueMessage<string> = {
        body: 'immediate message',
      }

      await queue.send(message)

      const mockBullQueue = BullQueue.mock.results[0].value
      expect(mockBullQueue.add).toHaveBeenCalledWith(
        'message',
        expect.objectContaining({ body: 'immediate message' }),
        expect.objectContaining({
          delay: undefined,
        }),
      )
    })

    it('should configure retry options', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('retry-queue')

      await queue.send({ body: 'test' })

      const mockBullQueue = BullQueue.mock.results[0].value
      expect(mockBullQueue.add).toHaveBeenCalledWith(
        'message',
        expect.objectContaining({ body: 'test' }),
        expect.objectContaining({
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        }),
      )
    })

    it('should persist message attributes in the envelope and return them on receive (previously silently dropped)', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('attrs-roundtrip-queue')

      await queue.send({
        body: { data: 'test' },
        attributes: { type: 'notification', priority: 1 },
      })

      const mockBullQueue = BullQueue.mock.results[0].value
      expect(mockBullQueue.add).toHaveBeenCalledWith(
        'message',
        expect.objectContaining({
          __molecule_queue_envelope: 1,
          attributes: { type: 'notification', priority: 1 },
        }),
        expect.anything(),
      )
    })

    it('should use deduplicationId as the BullMQ jobId when no explicit id is given (real dedup, not silently dropped)', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('dedup-queue')

      await queue.send({ body: 'test', deduplicationId: 'stable-dedup-key' })

      const mockBullQueue = BullQueue.mock.results[0].value
      expect(mockBullQueue.add).toHaveBeenCalledWith(
        'message',
        expect.anything(),
        expect.objectContaining({ jobId: 'stable-dedup-key' }),
      )
    })

    it('should prefer an explicit id over deduplicationId', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('dedup-id-precedence-queue')

      await queue.send({ body: 'test', id: 'explicit-id', deduplicationId: 'dedup-key' })

      const mockBullQueue = BullQueue.mock.results[0].value
      expect(mockBullQueue.add).toHaveBeenCalledWith(
        'message',
        expect.anything(),
        expect.objectContaining({ jobId: 'explicit-id' }),
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

      expect(ids).toBeDefined()
      expect(Array.isArray(ids)).toBe(true)
    })

    it('should send messages with individual IDs', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('batch-ids-queue')

      const messages: QueueMessage<string>[] = [
        { body: 'msg 1', id: 'id-1' },
        { body: 'msg 2', id: 'id-2' },
      ]

      await queue.sendBatch!(messages)

      const mockBullQueue = BullQueue.mock.results[0].value
      expect(mockBullQueue.addBulk).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'message',
            data: expect.objectContaining({ __molecule_queue_envelope: 1, body: 'msg 1' }),
            opts: expect.objectContaining({ jobId: 'id-1' }),
          }),
          expect.objectContaining({
            name: 'message',
            data: expect.objectContaining({ __molecule_queue_envelope: 1, body: 'msg 2' }),
            opts: expect.objectContaining({ jobId: 'id-2' }),
          }),
        ]),
      )
    })

    it('should send messages with delays', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('batch-delay-queue')

      const messages: QueueMessage<string>[] = [
        { body: 'immediate' },
        { body: 'delayed', delaySeconds: 60 },
      ]

      await queue.sendBatch!(messages)

      const mockBullQueue = BullQueue.mock.results[0].value
      expect(mockBullQueue.addBulk).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            opts: expect.objectContaining({ delay: undefined }),
          }),
          expect.objectContaining({
            opts: expect.objectContaining({ delay: 60000 }),
          }),
        ]),
      )
    })
  })

  describe('queue.receive', () => {
    it('should receive messages from the queue', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('receive-queue')

      const messages = await queue.receive()

      expect(messages).toBeDefined()
      expect(Array.isArray(messages)).toBe(true)
    })

    it('should receive with default maxMessages', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('receive-default-queue')

      await queue.receive()

      const mockBullQueue = BullQueue.mock.results[0].value
      expect(mockBullQueue.getJobs).toHaveBeenCalledWith(['waiting'], 0, 9) // maxMessages - 1 = 9
    })

    it('should receive with custom maxMessages', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('receive-custom-queue')

      const options: ReceiveOptions = {
        maxMessages: 5,
      }
      await queue.receive(options)

      const mockBullQueue = BullQueue.mock.results[0].value
      expect(mockBullQueue.getJobs).toHaveBeenCalledWith(['waiting'], 0, 4) // maxMessages - 1 = 4
    })

    it('should return ReceivedMessage objects', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('received-msg-queue')

      const messages = await queue.receive<{ test: string }>()

      expect(messages.length).toBeGreaterThan(0)
      const msg = messages[0]
      expect(msg.id).toBeDefined()
      expect(msg.body).toBeDefined()
      expect(msg.receiptHandle).toBeDefined()
      expect(typeof msg.ack).toBe('function')
      expect(typeof msg.nack).toBe('function')
    })

    it('should still return the peeked jobs when visibilityTimeout is passed (it has no locking effect on this bond — warned, not silently honored)', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('visibility-noop-queue')

      // Must not throw and must not pretend to lock anything — receive() stays a peek.
      const messages = await queue.receive({ visibilityTimeout: 30 })

      expect(messages.length).toBeGreaterThan(0)
    })
  })

  describe('queue.subscribe', () => {
    it('should subscribe to messages', () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('subscribe-queue')

      const handler: MessageHandler<string> = vi.fn()
      const unsubscribe = queue.subscribe(handler)

      expect(typeof unsubscribe).toBe('function')
      expect(Worker).toHaveBeenCalled()
    })

    it('should create worker with correct queue name', () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('worker-queue')

      const handler: MessageHandler<string> = vi.fn()
      queue.subscribe(handler)

      expect(Worker).toHaveBeenCalledWith(
        'worker-queue',
        expect.any(Function),
        expect.objectContaining({
          concurrency: 1, // default maxMessages
        }),
      )
    })

    it('should create worker with custom concurrency', () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('concurrency-queue')

      const handler: MessageHandler<string> = vi.fn()
      const options: ReceiveOptions = { maxMessages: 5 }
      queue.subscribe(handler, options)

      expect(Worker).toHaveBeenCalledWith(
        'concurrency-queue',
        expect.any(Function),
        expect.objectContaining({
          concurrency: 5,
        }),
      )
    })

    it('should register event handlers on worker', () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('events-queue')

      const handler: MessageHandler<string> = vi.fn()
      queue.subscribe(handler)

      const mockWorker = Worker.mock.results[0].value
      expect(mockWorker.on).toHaveBeenCalledWith('completed', expect.any(Function))
      expect(mockWorker.on).toHaveBeenCalledWith('failed', expect.any(Function))
      expect(mockWorker.on).toHaveBeenCalledWith('error', expect.any(Function))
    })

    it('should return unsubscribe function that closes worker', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('unsubscribe-queue')

      const handler: MessageHandler<string> = vi.fn()
      const unsubscribe = queue.subscribe(handler)

      unsubscribe()

      const mockWorker = Worker.mock.results[0].value
      expect(mockWorker.close).toHaveBeenCalled()
    })

    it('ack() inside a subscriber handler is a no-op (job is locked; completion is the ack)', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('locked-ack-queue')

      queue.subscribe(async (message) => {
        // The memory-bond docs pattern: handlers may call ack() explicitly.
        // On a locked BullMQ job, job.remove() throws and FAILS the job —
        // tripling the work and burning all retries. It must be a no-op.
        await message.ack()
      })

      const mockWorker = Worker.mock.results[0].value
      const processor = mockWorker.__processor as (job: Job) => Promise<void>

      const mockRemove = vi.fn()
      const lockedJob = {
        id: 'locked-job',
        data: { test: 'data' },
        opts: {},
        attemptsMade: 0,
        timestamp: Date.now(),
        token: 'worker-lock-token',
        remove: mockRemove,
        moveToFailed: vi.fn(),
      } as unknown as Job

      await expect(processor(lockedJob)).resolves.toBeUndefined()
      expect(mockRemove).not.toHaveBeenCalled()
    })

    it('nack() inside a subscriber handler rejects the job so BullMQ retries it', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('nack-subscriber-queue')

      queue.subscribe(async (message) => {
        await message.nack!()
      })

      const mockWorker = Worker.mock.results[0].value
      const processor = mockWorker.__processor as (job: Job) => Promise<void>

      const mockMoveToFailed = vi.fn()
      const lockedJob = {
        id: 'rejected-job',
        data: { test: 'data' },
        opts: {},
        attemptsMade: 0,
        timestamp: Date.now(),
        token: 'worker-lock-token',
        remove: vi.fn(),
        moveToFailed: mockMoveToFailed,
      } as unknown as Job

      // The processor must throw (BullMQ's retry path) rather than calling
      // moveToFailed mid-processing, which corrupts the worker's lock state.
      await expect(processor(lockedJob)).rejects.toThrow(/rejected/i)
      expect(mockMoveToFailed).not.toHaveBeenCalled()
    })

    it('should handle multiple subscriptions', () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('multi-sub-queue')

      const handler1: MessageHandler<string> = vi.fn()
      const handler2: MessageHandler<string> = vi.fn()

      const unsubscribe1 = queue.subscribe(handler1)
      const unsubscribe2 = queue.subscribe(handler2)

      expect(typeof unsubscribe1).toBe('function')
      expect(typeof unsubscribe2).toBe('function')
      expect(Worker).toHaveBeenCalledTimes(2)
    })
  })

  describe('queue.size', () => {
    it('should return the total count of messages', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('size-queue')

      const size = await queue.size!()

      // waiting: 5 + active: 2 + delayed: 1 = 8
      expect(size).toBe(8)
    })

    it('should call getJobCounts with correct states', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('job-counts-queue')

      await queue.size!()

      const mockBullQueue = BullQueue.mock.results[0].value
      expect(mockBullQueue.getJobCounts).toHaveBeenCalledWith('waiting', 'active', 'delayed')
    })
  })

  describe('queue.purge', () => {
    it('should drain the queue', async () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('purge-queue')

      await queue.purge!()

      const mockBullQueue = BullQueue.mock.results[0].value
      expect(mockBullQueue.drain).toHaveBeenCalled()
    })
  })

  describe('createReceivedMessage', () => {
    it('should create a ReceivedMessage from a BullMQ Job', async () => {
      const mockJob = {
        id: 'test-job-id',
        data: { payload: 'test-data' },
        opts: { priority: 1 },
        attemptsMade: 2,
        timestamp: 1704067200000, // 2024-01-01 00:00:00
        token: 'job-token',
        remove: vi.fn().mockResolvedValue(undefined),
        moveToFailed: vi.fn().mockResolvedValue(undefined),
      } as unknown as Job

      const receivedMessage = createReceivedMessage(mockJob)

      expect(receivedMessage.id).toBe('test-job-id')
      expect(receivedMessage.body).toEqual({ payload: 'test-data' })
      expect(receivedMessage.receiptHandle).toBe('test-job-id')
      expect(receivedMessage.receiveCount).toBe(3) // attemptsMade + 1
      expect(receivedMessage.sentTimestamp).toBeInstanceOf(Date)
      expect(receivedMessage.sentTimestamp?.getTime()).toBe(1704067200000)
    })

    it('should handle job without timestamp', async () => {
      const mockJob = {
        id: 'no-timestamp-job',
        data: 'data',
        opts: {},
        attemptsMade: 0,
        timestamp: undefined,
        token: 'token',
        remove: vi.fn(),
        moveToFailed: vi.fn(),
      } as unknown as Job

      const receivedMessage = createReceivedMessage(mockJob)

      expect(receivedMessage.sentTimestamp).toBeUndefined()
    })

    it('should handle job without ID', async () => {
      const mockJob = {
        id: undefined,
        data: 'data',
        opts: {},
        attemptsMade: 0,
        timestamp: Date.now(),
        token: 'token',
        remove: vi.fn(),
        moveToFailed: vi.fn(),
      } as unknown as Job

      const receivedMessage = createReceivedMessage(mockJob)

      expect(receivedMessage.id).toBe('')
      expect(receivedMessage.receiptHandle).toBe('')
    })

    it('should unwrap the envelope and return the real attributes sent via send() (previously silently dropped)', async () => {
      const mockJob = {
        id: 'enveloped-job',
        data: {
          __molecule_queue_envelope: 1,
          body: { orderId: 'ORD-1' },
          attributes: { type: 'notification', priority: 1 },
        },
        opts: { attempts: 3, jobId: 'enveloped-job' }, // BullMQ's OWN retry config — must never leak as "attributes"
        attemptsMade: 0,
        timestamp: Date.now(),
        token: 'token',
        remove: vi.fn(),
        moveToFailed: vi.fn(),
      } as unknown as Job

      const receivedMessage = createReceivedMessage(mockJob)

      expect(receivedMessage.body).toEqual({ orderId: 'ORD-1' })
      expect(receivedMessage.attributes).toEqual({ type: 'notification', priority: 1 })
    })

    it('should treat a legacy (pre-envelope) job as a raw body with no attributes — never job.opts', async () => {
      const mockJob = {
        id: 'legacy-job',
        data: { legacyPayload: true }, // no __molecule_queue_envelope marker — sent by an older version
        opts: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
        attemptsMade: 0,
        timestamp: Date.now(),
        token: 'token',
        remove: vi.fn(),
        moveToFailed: vi.fn(),
      } as unknown as Job

      const receivedMessage = createReceivedMessage(mockJob)

      expect(receivedMessage.body).toEqual({ legacyPayload: true })
      expect(receivedMessage.attributes).toBeUndefined()
    })

    describe('ack', () => {
      it('should remove the job when acknowledged', async () => {
        const mockRemove = vi.fn().mockResolvedValue(undefined)
        const mockJob = {
          id: 'ack-job',
          data: 'data',
          opts: {},
          attemptsMade: 0,
          timestamp: Date.now(),
          token: 'token',
          remove: mockRemove,
          moveToFailed: vi.fn(),
        } as unknown as Job

        const receivedMessage = createReceivedMessage(mockJob)
        await receivedMessage.ack()

        expect(mockRemove).toHaveBeenCalled()
      })
    })

    describe('nack', () => {
      it('should move job to failed when rejected', async () => {
        const mockMoveToFailed = vi.fn().mockResolvedValue(undefined)
        const mockJob = {
          id: 'nack-job',
          data: 'data',
          opts: {},
          attemptsMade: 0,
          timestamp: Date.now(),
          token: 'nack-token',
          remove: vi.fn(),
          moveToFailed: mockMoveToFailed,
        } as unknown as Job

        const receivedMessage = createReceivedMessage(mockJob)
        await receivedMessage.nack()

        expect(mockMoveToFailed).toHaveBeenCalledWith(expect.any(Error), 'nack-token')
      })

      it('is a safe no-op for an unlocked job (receive() path) instead of a cryptic "Missing lock" throw', async () => {
        const mockMoveToFailed = vi.fn().mockResolvedValue(undefined)
        const mockJob = {
          id: 'no-token-job',
          data: 'data',
          opts: {},
          attemptsMade: 0,
          timestamp: Date.now(),
          token: undefined, // getJobs('waiting') jobs hold no lock
          remove: vi.fn(),
          moveToFailed: mockMoveToFailed,
        } as unknown as Job

        const receivedMessage = createReceivedMessage(mockJob)
        await expect(receivedMessage.nack!()).resolves.toBeUndefined()

        // moveToFailed('') on an unlocked job throws "Missing lock" in BullMQ —
        // a waiting job is already "in the queue", so nothing must be sent.
        expect(mockMoveToFailed).not.toHaveBeenCalled()
      })
    })
  })

  describe('default provider export', () => {
    it('should export a default provider instance', async () => {
      // Re-import to get the default provider
      const module = await import('../provider.js')

      expect(module.provider).toBeDefined()
      expect(typeof module.provider.queue).toBe('function')
    })
  })

  describe('type exports', () => {
    it('should export all required types', async () => {
      const module = await import('../index.js')

      // These are type-only exports, so we just verify the module loads
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

    it('should use REDIS_URL when provided', () => {
      process.env.REDIS_URL = 'redis://test-url:6379'

      const providerInstance = createProvider()

      expect(providerInstance).toBeDefined()
    })

    it('should use REDIS_HOST and REDIS_PORT when URL is not provided', () => {
      delete process.env.REDIS_URL
      process.env.REDIS_HOST = 'custom-redis-host'
      process.env.REDIS_PORT = '6380'

      const providerInstance = createProvider()

      expect(providerInstance).toBeDefined()
    })

    it('should use REDIS_PASSWORD when provided', () => {
      process.env.REDIS_PASSWORD = 'secret123'

      const providerInstance = createProvider()

      expect(providerInstance).toBeDefined()
    })

    it('should use default values when no env vars are set', () => {
      delete process.env.REDIS_URL
      delete process.env.REDIS_HOST
      delete process.env.REDIS_PORT
      delete process.env.REDIS_PASSWORD

      const providerInstance = createProvider()

      expect(providerInstance).toBeDefined()
    })
  })

  describe('connection options', () => {
    it('should use URL connection when url option is provided', () => {
      const providerInstance = createProvider({ url: 'redis://my-redis:6379' })
      providerInstance.queue('test-url-queue')

      expect(BullQueue).toHaveBeenCalled()
    })

    it('should use host/port connection when url is not provided', () => {
      const providerInstance = createProvider({
        host: 'redis-server',
        port: 6380,
        password: 'pass123',
      })
      providerInstance.queue('test-host-queue')

      expect(BullQueue).toHaveBeenCalled()
    })

    it('should use custom prefix', () => {
      const providerInstance = createProvider({ prefix: 'myapp:queues:' })
      providerInstance.queue('test')

      expect(BullQueue).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          prefix: 'myapp:queues:',
        }),
      )
    })

    it('should use default prefix when not specified', () => {
      const providerInstance = createProvider()
      providerInstance.queue('default-prefix-test')

      expect(BullQueue).toHaveBeenCalledWith(
        'default-prefix-test',
        expect.objectContaining({
          prefix: 'molecule:queue:',
        }),
      )
    })

    it('should configure the PRODUCER (BullQueue) connection to fail fast instead of buffering commands forever against an unreachable Redis', () => {
      const providerInstance = createProvider()
      providerInstance.queue('fail-fast-producer-queue')

      expect(BullQueue).toHaveBeenCalledWith(
        'fail-fast-producer-queue',
        expect.objectContaining({
          connection: expect.objectContaining({
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
          }),
        }),
      )
    })

    it('should NOT apply the fail-fast overlay to the WORKER (subscribe) connection — BullMQ forces maxRetriesPerRequest: null on blocking connections regardless', () => {
      const providerInstance = createProvider()
      const queue = providerInstance.queue('worker-connection-queue')
      queue.subscribe(vi.fn())

      expect(Worker).toHaveBeenCalledWith(
        'worker-connection-queue',
        expect.any(Function),
        expect.objectContaining({
          connection: expect.not.objectContaining({ enableOfflineQueue: false }),
        }),
      )
    })
  })

  describe('fail-fast connection error messages (name REDIS_URL/REDIS_HOST instead of leaving a raw ioredis error)', () => {
    it('should wrap a connection-refused send() failure with an actionable message naming the env vars', async () => {
      const errorQueue = {
        add: vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:6379')),
        addBulk: vi.fn(),
        getJobs: vi.fn(),
        getJobCounts: vi.fn(),
        drain: vi.fn(),
        obliterate: vi.fn(),
        close: vi.fn(),
      }
      BullQueue.mockImplementationOnce(function () {
        return errorQueue
      })

      const providerInstance = createProvider()
      const queue = providerInstance.queue('connection-error-queue')

      await expect(queue.send({ body: 'test' })).rejects.toThrow(/REDIS_URL/)
    })

    it('should leave a non-connection application error unwrapped', async () => {
      const errorQueue = {
        add: vi.fn().mockRejectedValue(new Error('Job data too large')),
        addBulk: vi.fn(),
        getJobs: vi.fn(),
        getJobCounts: vi.fn(),
        drain: vi.fn(),
        obliterate: vi.fn(),
        close: vi.fn(),
      }
      BullQueue.mockImplementationOnce(function () {
        return errorQueue
      })

      const providerInstance = createProvider()
      const queue = providerInstance.queue('app-error-queue')

      await expect(queue.send({ body: 'test' })).rejects.toThrow('Job data too large')
    })
  })

  describe('error handling', () => {
    it('should handle send errors', async () => {
      const errorQueue = {
        add: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
        addBulk: vi.fn(),
        getJobs: vi.fn(),
        getJobCounts: vi.fn(),
        drain: vi.fn(),
        obliterate: vi.fn(),
        close: vi.fn(),
      }

      BullQueue.mockImplementationOnce(function () {
        return errorQueue
      })

      const providerInstance = createProvider()
      const queue = providerInstance.queue('error-queue')

      await expect(queue.send({ body: 'test' })).rejects.toThrow('Redis connection failed')
    })

    it('should handle receive errors', async () => {
      const errorQueue = {
        add: vi.fn(),
        addBulk: vi.fn(),
        getJobs: vi.fn().mockRejectedValue(new Error('Failed to get jobs')),
        getJobCounts: vi.fn(),
        drain: vi.fn(),
        obliterate: vi.fn(),
        close: vi.fn(),
      }

      BullQueue.mockImplementationOnce(function () {
        return errorQueue
      })

      const providerInstance = createProvider()
      const queue = providerInstance.queue('receive-error-queue')

      await expect(queue.receive()).rejects.toThrow('Failed to get jobs')
    })

    it('should handle size errors', async () => {
      const errorQueue = {
        add: vi.fn(),
        addBulk: vi.fn(),
        getJobs: vi.fn(),
        getJobCounts: vi.fn().mockRejectedValue(new Error('Failed to get counts')),
        drain: vi.fn(),
        obliterate: vi.fn(),
        close: vi.fn(),
      }

      BullQueue.mockImplementationOnce(function () {
        return errorQueue
      })

      const providerInstance = createProvider()
      const queue = providerInstance.queue('size-error-queue')

      await expect(queue.size!()).rejects.toThrow('Failed to get counts')
    })

    it('should handle purge errors', async () => {
      const errorQueue = {
        add: vi.fn(),
        addBulk: vi.fn(),
        getJobs: vi.fn(),
        getJobCounts: vi.fn(),
        drain: vi.fn().mockRejectedValue(new Error('Failed to drain')),
        obliterate: vi.fn(),
        close: vi.fn(),
      }

      BullQueue.mockImplementationOnce(function () {
        return errorQueue
      })

      const providerInstance = createProvider()
      const queue = providerInstance.queue('purge-error-queue')

      await expect(queue.purge!()).rejects.toThrow('Failed to drain')
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

      const mockBullQueue = BullQueue.mock.results[0].value
      expect(mockBullQueue.add).toHaveBeenCalledWith(
        'message',
        expect.objectContaining({ body: message.body }),
        expect.any(Object),
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
    })
  })
})

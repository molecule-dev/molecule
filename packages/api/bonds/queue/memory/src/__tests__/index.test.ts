import { afterEach, describe, expect, it, vi } from 'vitest'

import type { QueueProvider, ReceivedMessage } from '@molecule/api-queue'

import { createProvider } from '../provider.js'

/** Sleeps for the given number of milliseconds. */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** Polls `check` every 5ms until truthy or the timeout elapses. */
const waitFor = async (
  check: () => boolean | Promise<boolean>,
  timeoutMs = 2000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await check()) return
    await sleep(5)
  }
  throw new Error('waitFor timed out')
}

describe('@molecule/api-queue-memory', () => {
  const providers: QueueProvider[] = []

  /** Creates a provider that is automatically closed after the test. */
  const makeProvider = (...args: Parameters<typeof createProvider>): QueueProvider => {
    const providerInstance = createProvider(...args)
    providers.push(providerInstance)
    return providerInstance
  }

  afterEach(async () => {
    for (const providerInstance of providers.splice(0)) {
      await providerInstance.close?.()
    }
    vi.restoreAllMocks()
  })

  describe('createProvider', () => {
    it('creates a provider with no options and no env vars', () => {
      const providerInstance = makeProvider()

      expect(providerInstance).toBeDefined()
      expect(typeof providerInstance.queue).toBe('function')
      expect(typeof providerInstance.listQueues).toBe('function')
      expect(typeof providerInstance.createQueue).toBe('function')
      expect(typeof providerInstance.deleteQueue).toBe('function')
      expect(typeof providerInstance.close).toBe('function')
    })
  })

  describe('provider.queue', () => {
    it('returns a queue with the given name', () => {
      const providerInstance = makeProvider()
      const queue = providerInstance.queue('test-queue')

      expect(queue).toBeDefined()
      expect(queue.name).toBe('test-queue')
    })

    it('returns the same queue instance for the same name', () => {
      const providerInstance = makeProvider()

      expect(providerInstance.queue('same')).toBe(providerInstance.queue('same'))
    })

    it('returns different queue instances for different names', () => {
      const providerInstance = makeProvider()
      const queue1 = providerInstance.queue('queue-1')
      const queue2 = providerInstance.queue('queue-2')

      expect(queue1).not.toBe(queue2)
      expect(queue1.name).toBe('queue-1')
      expect(queue2.name).toBe('queue-2')
    })
  })

  describe('provider.listQueues / createQueue / deleteQueue', () => {
    it('lists created queues', async () => {
      const providerInstance = makeProvider()
      providerInstance.queue('a')
      providerInstance.queue('b')

      expect(await providerInstance.listQueues!()).toEqual(['a', 'b'])
    })

    it('createQueue returns the existing queue when already created', async () => {
      const providerInstance = makeProvider()
      const existing = providerInstance.queue('existing')

      expect(await providerInstance.createQueue!('existing')).toBe(existing)
    })

    it('deleteQueue removes the queue and stops it', async () => {
      const providerInstance = makeProvider()
      const queue = providerInstance.queue('doomed')
      await queue.send({ body: 1 })

      await providerInstance.deleteQueue!('doomed')

      expect(await providerInstance.listQueues!()).not.toContain('doomed')
      await expect(queue.send({ body: 2 })).rejects.toThrow('closed')
    })

    it('deleteQueue is a no-op for unknown queues', async () => {
      const providerInstance = makeProvider()

      await expect(providerInstance.deleteQueue!('nope')).resolves.toBeUndefined()
    })
  })

  describe('queue.send', () => {
    it('returns a generated message id', async () => {
      const queue = makeProvider().queue('send')

      const id = await queue.send({ body: { hello: 'world' } })

      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    })

    it('respects a caller-provided id', async () => {
      const queue = makeProvider().queue('send-id')

      expect(await queue.send({ body: 'x', id: 'custom-id' })).toBe('custom-id')
    })

    it('clones the body — post-send mutations do not leak to consumers', async () => {
      const queue = makeProvider().queue('clone')
      const body = { value: 'original' }
      await queue.send({ body })
      body.value = 'mutated'

      const [message] = await queue.receive<{ value: string }>()

      expect(message.body).toEqual({ value: 'original' })
    })

    it('rejects non-structured-cloneable bodies (broker serialization parity)', async () => {
      const queue = makeProvider().queue('uncloneable')

      await expect(queue.send({ body: { fn: () => 1 } })).rejects.toThrow()
    })

    it('delayed messages are invisible until delaySeconds elapses', async () => {
      const queue = makeProvider().queue('delayed')
      await queue.send({ body: 'later', delaySeconds: 0.06 })

      expect(await queue.receive()).toEqual([])

      await sleep(80)
      const messages = await queue.receive()
      expect(messages).toHaveLength(1)
      expect(messages[0].body).toBe('later')
    })
  })

  describe('queue.sendBatch', () => {
    it('sends multiple messages and returns their ids in order', async () => {
      const queue = makeProvider().queue('batch')

      const ids = await queue.sendBatch!([
        { body: 'one', id: 'id-1' },
        { body: 'two' },
        { body: 'three' },
      ])

      expect(ids).toHaveLength(3)
      expect(ids[0]).toBe('id-1')
      expect(await queue.size!()).toBe(3)
    })
  })

  describe('queue.receive', () => {
    it('pulls messages with receipt metadata in FIFO order', async () => {
      const queue = makeProvider().queue('pull')
      await queue.send({ body: 'first', attributes: { kind: 'a' } })
      await queue.send({ body: 'second' })

      const messages = await queue.receive()

      expect(messages.map((message) => message.body)).toEqual(['first', 'second'])
      expect(typeof messages[0].id).toBe('string')
      expect(typeof messages[0].receiptHandle).toBe('string')
      expect(messages[0].receiptHandle.length).toBeGreaterThan(0)
      expect(messages[0].attributes).toEqual({ kind: 'a' })
      expect(messages[0].receiveCount).toBe(1)
      expect(messages[0].sentTimestamp).toBeInstanceOf(Date)
    })

    it('respects maxMessages', async () => {
      const queue = makeProvider().queue('max')
      await queue.sendBatch!([{ body: 1 }, { body: 2 }, { body: 3 }])

      expect(await queue.receive({ maxMessages: 2 })).toHaveLength(2)
    })

    it('leased messages are invisible to subsequent receives', async () => {
      const queue = makeProvider().queue('invisible')
      await queue.send({ body: 'x' })

      expect(await queue.receive()).toHaveLength(1)
      expect(await queue.receive()).toEqual([])
    })

    it('redelivers with an incremented receiveCount after the visibility timeout expires without ack', async () => {
      const queue = makeProvider().queue('redeliver')
      await queue.send({ body: 'retry-me' })

      const [first] = await queue.receive({ visibilityTimeout: 0.05 })
      expect(first.receiveCount).toBe(1)

      await sleep(80)
      const [second] = await queue.receive({ visibilityTimeout: 0.05 })
      expect(second).toBeDefined()
      expect(second.body).toBe('retry-me')
      expect(second.receiveCount).toBe(2)
    })

    it('ack removes the message; a second ack is a no-op', async () => {
      const queue = makeProvider().queue('ack')
      await queue.send({ body: 'done' })

      const [message] = await queue.receive()
      await message.ack()
      await message.ack()

      expect(await queue.size!()).toBe(0)
      expect(await queue.receive()).toEqual([])
    })

    it('a stale ack (after lease expiry + redelivery) is a no-op', async () => {
      const queue = makeProvider().queue('stale-ack')
      await queue.send({ body: 'contested' })

      const [first] = await queue.receive({ visibilityTimeout: 0.05 })
      await sleep(80)
      const [second] = await queue.receive({ visibilityTimeout: 5 })
      expect(second).toBeDefined()

      await first.ack() // stale — the redelivery owns the message now
      expect(await queue.size!()).toBe(1)

      await second.ack()
      expect(await queue.size!()).toBe(0)
    })

    it('nack returns the message to the queue immediately', async () => {
      const queue = makeProvider().queue('nack')
      await queue.send({ body: 'again' })

      const [message] = await queue.receive({ visibilityTimeout: 5 })
      await message.nack!()

      const [redelivered] = await queue.receive()
      expect(redelivered).toBeDefined()
      expect(redelivered.body).toBe('again')
      expect(redelivered.receiveCount).toBe(2)
    })

    it('long-polls until a message arrives (waitTimeSeconds)', async () => {
      const queue = makeProvider().queue('long-poll')

      const pending = queue.receive({ waitTimeSeconds: 2 })
      await sleep(30)
      await queue.send({ body: 'awaited' })

      const messages = await pending
      expect(messages).toHaveLength(1)
      expect(messages[0].body).toBe('awaited')
    })

    it('long-poll resolves with [] when waitTimeSeconds elapses with no message', async () => {
      const queue = makeProvider().queue('poll-timeout')

      const start = Date.now()
      const messages = await queue.receive({ waitTimeSeconds: 0.05 })

      expect(messages).toEqual([])
      expect(Date.now() - start).toBeGreaterThanOrEqual(40)
    })
  })

  describe('queue.subscribe', () => {
    it('delivers a sent message to the subscriber and auto-acks on handler success', async () => {
      const queue = makeProvider().queue('sub')
      const received: unknown[] = []
      const unsubscribe = queue.subscribe(async (message) => {
        received.push(message.body)
      })

      await queue.send({ body: { n: 42 } })
      await waitFor(() => received.length === 1)

      expect(received[0]).toEqual({ n: 42 })
      await waitFor(async () => (await queue.size!()) === 0) // auto-ack settles
      unsubscribe()
    })

    it('delivers backlog that was sent before subscribing', async () => {
      const queue = makeProvider().queue('backlog')
      await queue.send({ body: 'a' })
      await queue.send({ body: 'b' })

      const received: unknown[] = []
      const unsubscribe = queue.subscribe(async (message) => {
        received.push(message.body)
        await message.ack()
      })

      await waitFor(() => received.length === 2)
      expect(received).toEqual(['a', 'b'])
      unsubscribe()
    })

    it('delivers delayed messages once they become visible', async () => {
      const queue = makeProvider().queue('sub-delayed')
      const received: unknown[] = []
      const unsubscribe = queue.subscribe(async (message) => {
        received.push(message.body)
      })

      await queue.send({ body: 'later', delaySeconds: 0.05 })
      expect(received).toHaveLength(0)

      await waitFor(() => received.length === 1)
      expect(received[0]).toBe('later')
      unsubscribe()
    })

    it('redelivers when the handler throws, then succeeds', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      const queue = makeProvider().queue('sub-retry')
      let attempts = 0
      const unsubscribe = queue.subscribe(async () => {
        attempts += 1
        if (attempts < 3) {
          throw new Error('transient failure')
        }
      })

      await queue.send({ body: 'eventually' })
      await waitFor(() => attempts === 3)

      await waitFor(async () => (await queue.size!()) === 0)
      unsubscribe()
    })

    it('drops a message (with an error log) after maxReceiveCount failed deliveries', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const queue = makeProvider({ maxReceiveCount: 2 }).queue('sub-drop')
      let attempts = 0
      const unsubscribe = queue.subscribe(async () => {
        attempts += 1
        throw new Error('always failing')
      })

      await queue.send({ body: 'poison' })
      await waitFor(() => attempts === 2)
      await waitFor(() => errorSpy.mock.calls.length > 0)

      expect(attempts).toBe(2)
      expect(await queue.size!()).toBe(0)
      unsubscribe()
    })

    it('routes exhausted messages to the configured dead-letter queue', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      const providerInstance = makeProvider()
      const queue = await providerInstance.createQueue!('work', {
        deadLetterQueue: { name: 'work-dlq', maxReceiveCount: 2 },
      })
      const dlq = providerInstance.queue('work-dlq')

      let attempts = 0
      const unsubscribe = queue.subscribe(async () => {
        attempts += 1
        throw new Error('always failing')
      })

      const id = await queue.send({ body: { job: 'poison' } })
      await waitFor(() => attempts === 2)

      let deadLettered: ReceivedMessage[] = []
      await waitFor(async () => {
        deadLettered = await dlq.receive()
        return deadLettered.length > 0
      })

      expect(deadLettered[0].id).toBe(id)
      expect(deadLettered[0].body).toEqual({ job: 'poison' })
      expect(await queue.size!()).toBe(0)
      unsubscribe()
    })

    it('bounds concurrency to maxMessages', async () => {
      const queue = makeProvider().queue('concurrency')
      let inFlight = 0
      let maxInFlight = 0
      let release!: () => void
      const gate = new Promise<void>((resolve) => {
        release = resolve
      })
      let handled = 0

      const unsubscribe = queue.subscribe(
        async () => {
          inFlight += 1
          maxInFlight = Math.max(maxInFlight, inFlight)
          await gate
          inFlight -= 1
          handled += 1
        },
        { maxMessages: 2 },
      )

      await queue.sendBatch!([{ body: 1 }, { body: 2 }, { body: 3 }])
      await waitFor(() => inFlight === 2)
      await sleep(30) // give the third message a chance to (wrongly) dispatch
      expect(maxInFlight).toBe(2)

      release()
      await waitFor(() => handled === 3)
      expect(maxInFlight).toBe(2)
      unsubscribe()
    })

    it('unsubscribe stops delivery and leaves messages in the queue', async () => {
      const queue = makeProvider().queue('unsub')
      const received: unknown[] = []
      const unsubscribe = queue.subscribe(async (message) => {
        received.push(message.body)
      })
      unsubscribe()

      await queue.send({ body: 'undelivered' })
      await sleep(50)

      expect(received).toHaveLength(0)
      expect(await queue.size!()).toBe(1)
    })
  })

  describe('FIFO queues', () => {
    it('blocks a message group while an earlier message is in flight', async () => {
      const providerInstance = makeProvider()
      const queue = await providerInstance.createQueue!('fifo', { fifo: true })
      await queue.send({ body: 'first', groupId: 'g1' })
      await queue.send({ body: 'second', groupId: 'g1' })
      await queue.send({ body: 'other-group', groupId: 'g2' })

      const messages = await queue.receive({ maxMessages: 10, visibilityTimeout: 5 })

      // One per group — g1's second message must not overtake its head.
      expect(messages.map((message) => message.body)).toEqual(['first', 'other-group'])

      await messages[0].ack()
      const [next] = await queue.receive({ maxMessages: 10 })
      expect(next.body).toBe('second')
    })

    it('deduplicates by deduplicationId within the window', async () => {
      const providerInstance = makeProvider()
      const queue = await providerInstance.createQueue!('fifo-dedup', { fifo: true })

      const id1 = await queue.send({ body: 'once', groupId: 'g', deduplicationId: 'dedup-1' })
      const id2 = await queue.send({ body: 'twice', groupId: 'g', deduplicationId: 'dedup-1' })

      expect(id2).toBe(id1)
      expect(await queue.size!()).toBe(1)
    })
  })

  describe('queue.size / queue.purge', () => {
    it('size counts ready, delayed, and in-flight messages', async () => {
      const queue = makeProvider().queue('size')
      await queue.send({ body: 1 })
      await queue.send({ body: 2, delaySeconds: 5 })
      await queue.receive({ maxMessages: 1, visibilityTimeout: 5 })

      expect(await queue.size!()).toBe(2)
    })

    it('purge empties the queue and neutralizes in-flight acks', async () => {
      const queue = makeProvider().queue('purge')
      await queue.send({ body: 1 })
      await queue.send({ body: 2 })
      const [inFlight] = await queue.receive({ maxMessages: 1 })

      await queue.purge!()

      expect(await queue.size!()).toBe(0)
      await expect(inFlight.ack()).resolves.toBeUndefined()
    })
  })

  describe('close', () => {
    it('close() rejects further sends and stops subscribers', async () => {
      const providerInstance = makeProvider()
      const queue = providerInstance.queue('closing')
      const received: unknown[] = []
      queue.subscribe(async (message) => {
        received.push(message.body)
      })

      await providerInstance.close!()

      await expect(queue.send({ body: 'too late' })).rejects.toThrow('closed')
      expect(await queue.receive()).toEqual([])
      expect(received).toHaveLength(0)
    })

    it('close() resolves pending long-polls with []', async () => {
      const providerInstance = makeProvider()
      const queue = providerInstance.queue('poll-close')

      const pending = queue.receive({ waitTimeSeconds: 5 })
      await sleep(10)
      await providerInstance.close!()

      expect(await pending).toEqual([])
    })

    it('close() is idempotent', async () => {
      const providerInstance = makeProvider()
      providerInstance.queue('idem')

      await providerInstance.close!()
      await expect(providerInstance.close!()).resolves.toBeUndefined()
    })
  })

  describe('default provider export', () => {
    it('exposes a lazily-created working provider', async () => {
      const { provider } = await import('../provider.js')

      const queue = provider.queue('lazy-default')
      const id = await queue.send({ body: 'works' })
      expect(typeof id).toBe('string')

      const [message] = await queue.receive()
      expect(message.body).toBe('works')
      await message.ack()
      await provider.close!()
    })
  })

  describe('type exports', () => {
    it('barrel exports the provider API', async () => {
      const module = await import('../index.js')

      expect(module.createProvider).toBeDefined()
      expect(module.provider).toBeDefined()
    })
  })
})

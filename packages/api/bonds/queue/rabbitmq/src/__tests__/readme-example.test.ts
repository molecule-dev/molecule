/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real queue core. Only
 * `amqplib` (the broker connection) is replaced — by a tiny in-memory broker
 * that delivers `sendToQueue` to the queue's consumer.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { send, setProvider, subscribe } from '@molecule/api-queue'

import { createProvider } from '../index.js'

interface FakeMessage {
  content: Buffer
  fields: { deliveryTag: number; redelivered: boolean }
  properties: { messageId?: string; headers?: Record<string, unknown> }
}

const broker = vi.hoisted(() => {
  const consumers = new Map<string, (msg: FakeMessage) => Promise<void>>()
  const published: Array<{ queue: string; body: unknown }> = []
  let deliveryTag = 0
  const channel = {
    prefetch: vi.fn(async () => undefined),
    assertQueue: vi.fn(async (queue: string) => ({ queue, messageCount: 0, consumerCount: 0 })),
    sendToQueue: vi.fn(
      (queue: string, content: Buffer, options: { messageId?: string; headers?: never }) => {
        published.push({ queue, body: JSON.parse(content.toString()) })
        const consumer = consumers.get(queue)
        deliveryTag += 1
        void consumer?.({
          content,
          fields: { deliveryTag, redelivered: false },
          properties: { messageId: options.messageId, headers: options.headers },
        })
        return true
      },
    ),
    consume: vi.fn(async (queue: string, onMessage: (msg: FakeMessage) => Promise<void>) => {
      consumers.set(queue, onMessage)
      return { consumerTag: `ctag-${queue}` }
    }),
    cancel: vi.fn(async (consumerTag: string) => {
      consumers.delete(consumerTag.replace(/^ctag-/, ''))
    }),
    ack: vi.fn(),
    nack: vi.fn(),
    close: vi.fn(async () => undefined),
    on: vi.fn(),
  }
  const connection = {
    createChannel: vi.fn(async () => channel),
    on: vi.fn(),
    close: vi.fn(async () => undefined),
  }
  return { channel, connection, published }
})

vi.mock('amqplib', () => ({ default: { connect: vi.fn(async () => broker.connection) } }))

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('declares a dead-letter queue, consumes, acks, parks delayed messages, and closes', async () => {
    vi.stubEnv('RABBITMQ_URL', 'amqps://rabbit.example.com:5671/app')
    const handlers: Array<() => void> = []
    vi.spyOn(process, 'on').mockImplementation(((_event: string, handler: () => void) => {
      handlers.push(handler)
      return process
    }) as typeof process.on)
    const amqp = (await import('amqplib')).default

    const rabbit = await createProvider({ url: process.env.RABBITMQ_URL, prefetch: 10 })
    setProvider(rabbit)

    await rabbit.createQueue?.('emails.dead')
    await rabbit.createQueue?.('emails', {
      deadLetterQueue: { name: 'emails.dead', maxReceiveCount: 2 },
    })

    interface WelcomeEmailJob {
      to: string
      name: string
    }
    const greeted: string[] = []
    const unsubscribe = subscribe<WelcomeEmailJob>('emails', async (message) => {
      greeted.push(`Welcome, ${message.body.name} <${message.body.to}>`)
    })
    await vi.waitFor(() => expect(broker.channel.consume).toHaveBeenCalled())

    await send<WelcomeEmailJob>('emails', { body: { to: 'ada@example.com', name: 'Ada' } })
    await send<WelcomeEmailJob>('emails', {
      body: { to: 'grace@example.com', name: 'Grace' },
      delaySeconds: 60,
    })

    process.on('SIGTERM', () => {
      unsubscribe()
      void rabbit.close?.()
    })

    expect(amqp.connect).toHaveBeenCalledWith('amqps://rabbit.example.com:5671/app')
    expect(broker.channel.prefetch).toHaveBeenCalledWith(10)
    expect(broker.channel.assertQueue).toHaveBeenCalledWith('emails', {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': 'emails.dead',
      },
    })
    await vi.waitFor(() => expect(greeted).toEqual(['Welcome, Ada <ada@example.com>']))
    expect(broker.channel.ack).toHaveBeenCalledTimes(1)
    expect(broker.published[1]).toEqual({
      queue: 'emails.delay.60000',
      body: { to: 'grace@example.com', name: 'Grace' },
    })
    expect(broker.channel.assertQueue).toHaveBeenCalledWith('emails.delay.60000', {
      durable: true,
      arguments: {
        'x-message-ttl': 60000,
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': 'emails',
      },
    })

    handlers[0]?.()
    await vi.waitFor(() => expect(broker.connection.close).toHaveBeenCalledTimes(1))
    expect(broker.channel.cancel).toHaveBeenCalledWith('ctag-emails')
  })
})

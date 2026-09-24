/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real queue core. Only
 * `@aws-sdk/client-sqs` (which calls AWS) is replaced — by a tiny in-memory
 * SQS whose client `send()` answers each command the bond issues.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { send, setProvider, subscribe } from '@molecule/api-queue'

import { createProvider } from '../index.js'

interface FakeCommand {
  type: string
  input: Record<string, unknown>
}

const aws = vi.hoisted(() => {
  const queues = new Map<
    string,
    Array<{ MessageId: string; Body: string; ReceiptHandle: string }>
  >()
  const created: Array<Record<string, unknown>> = []
  const sent: Array<Record<string, unknown>> = []
  const deleted: string[] = []
  let nextId = 0
  const urlOf = (name: string): string => `https://sqs.us-east-1.amazonaws.com/123456789012/${name}`
  const destroy = vi.fn()

  const handle = async (command: FakeCommand): Promise<unknown> => {
    const input = command.input
    switch (command.type) {
      case 'CreateQueueCommand': {
        created.push(input)
        queues.set(urlOf(String(input.QueueName)), [])
        return { QueueUrl: urlOf(String(input.QueueName)) }
      }
      case 'GetQueueUrlCommand': {
        const url = urlOf(String(input.QueueName))
        if (!queues.has(url))
          throw Object.assign(new Error('missing'), { name: 'QueueDoesNotExist' })
        return { QueueUrl: url }
      }
      case 'GetQueueAttributesCommand':
        return {
          Attributes: {
            QueueArn: `arn:aws:sqs:us-east-1:123456789012:${String(input.QueueUrl).split('/').pop()}`,
          },
        }
      case 'SendMessageCommand': {
        sent.push(input)
        nextId += 1
        if (!input.DelaySeconds) {
          queues.get(String(input.QueueUrl))?.push({
            MessageId: `m-${nextId}`,
            Body: String(input.MessageBody),
            ReceiptHandle: `r-${nextId}`,
          })
        }
        return { MessageId: `m-${nextId}` }
      }
      case 'ReceiveMessageCommand': {
        const pending = queues.get(String(input.QueueUrl)) ?? []
        if (pending.length === 0) await new Promise((resolve) => setTimeout(resolve, 5))
        return { Messages: pending.splice(0, Number(input.MaxNumberOfMessages)) }
      }
      case 'DeleteMessageCommand':
        deleted.push(String(input.ReceiptHandle))
        return {}
      default:
        throw new Error(`unexpected ${command.type}`)
    }
  }

  const command = (type: string) =>
    vi.fn(function (input: Record<string, unknown>) {
      return { type, input }
    })

  return {
    created,
    sent,
    deleted,
    destroy,
    module: {
      SQSClient: vi.fn(function () {
        return { send: (cmd: FakeCommand) => handle(cmd), destroy }
      }),
      ChangeMessageVisibilityCommand: command('ChangeMessageVisibilityCommand'),
      CreateQueueCommand: command('CreateQueueCommand'),
      DeleteMessageCommand: command('DeleteMessageCommand'),
      DeleteQueueCommand: command('DeleteQueueCommand'),
      GetQueueAttributesCommand: command('GetQueueAttributesCommand'),
      GetQueueUrlCommand: command('GetQueueUrlCommand'),
      ListQueuesCommand: command('ListQueuesCommand'),
      PurgeQueueCommand: command('PurgeQueueCommand'),
      ReceiveMessageCommand: command('ReceiveMessageCommand'),
      SendMessageBatchCommand: command('SendMessageBatchCommand'),
      SendMessageCommand: command('SendMessageCommand'),
    },
  }
})

vi.mock('@aws-sdk/client-sqs', () => aws.module)

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('creates the DLQ + redrive, consumes and deletes, sends delayed, and shuts down', async () => {
    vi.stubEnv('AWS_REGION', 'us-east-1')
    const handlers: Array<() => void> = []
    vi.spyOn(process, 'on').mockImplementation(((_event: string, handler: () => void) => {
      handlers.push(handler)
      return process
    }) as typeof process.on)

    const sqs = createProvider({ region: process.env.AWS_REGION })
    setProvider(sqs)

    await sqs.createQueue?.('emails-dlq')
    await sqs.createQueue?.('emails', {
      visibilityTimeout: 60,
      deadLetterQueue: { name: 'emails-dlq', maxReceiveCount: 5 },
    })

    interface WelcomeEmailJob {
      to: string
      name: string
    }
    const greeted: string[] = []
    const unsubscribe = subscribe<WelcomeEmailJob>('emails', async (message) => {
      greeted.push(`Welcome, ${message.body.name} <${message.body.to}>`)
    })

    await send<WelcomeEmailJob>('emails', { body: { to: 'ada@example.com', name: 'Ada' } })
    await send<WelcomeEmailJob>('emails', {
      body: { to: 'grace@example.com', name: 'Grace' },
      delaySeconds: 60,
    })

    process.on('SIGTERM', () => {
      unsubscribe()
      void sqs.close?.()
    })

    expect(aws.created[1]).toEqual({
      QueueName: 'emails',
      Attributes: {
        VisibilityTimeout: '60',
        RedrivePolicy: JSON.stringify({
          deadLetterTargetArn: 'arn:aws:sqs:us-east-1:123456789012:emails-dlq',
          maxReceiveCount: 5,
        }),
      },
    })
    await vi.waitFor(() => expect(greeted).toEqual(['Welcome, Ada <ada@example.com>']))
    await vi.waitFor(() => expect(aws.deleted).toEqual(['r-1']))
    expect(aws.sent[1]).toMatchObject({
      MessageBody: JSON.stringify({ to: 'grace@example.com', name: 'Grace' }),
      DelaySeconds: 60,
    })

    handlers[0]?.()
    expect(aws.destroy).toHaveBeenCalledTimes(1)
  })
})

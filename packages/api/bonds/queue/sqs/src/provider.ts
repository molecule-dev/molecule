/**
 * SQS queue provider implementation.
 *
 * @module
 */

import {
  CreateQueueCommand,
  DeleteQueueCommand,
  GetQueueAttributesCommand,
  GetQueueUrlCommand,
  ListQueuesCommand,
  SQSClient,
} from '@aws-sdk/client-sqs'

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type { Queue, QueueCreateOptions, QueueProvider } from '@molecule/api-queue'

import { createLazyQueue } from './lazy-queue.js'
import type { SQSOptions } from './types.js'

/** True when `error` is the AWS SDK's `QueueDoesNotExist` fault (checked by name, not `instanceof`, so it also works against test doubles that don't extend the real exception class). */
const isQueueDoesNotExistError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'name' in error &&
  (error as { name?: unknown }).name === 'QueueDoesNotExist'

/**
 * Creates an AWS SQS queue provider. Connects using `AWS_REGION` env var (default `'us-east-1'`),
 * optional explicit credentials, and optional custom endpoint (e.g. for LocalStack).
 * @param options - Optional AWS region, credentials, endpoint, and auto-create configuration. Falls back to environment variables.
 * @returns A `QueueProvider` that manages SQS queues. Queue URLs are resolved lazily on first operation.
 */
export const createProvider = (options?: SQSOptions): QueueProvider => {
  const region = options?.region ?? process.env.AWS_REGION ?? 'us-east-1'

  const clientConfig: ConstructorParameters<typeof SQSClient>[0] = {
    region,
  }

  if (options?.accessKeyId && options?.secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    }
  }

  if (options?.endpoint ?? process.env.SQS_ENDPOINT) {
    clientConfig.endpoint = options?.endpoint ?? process.env.SQS_ENDPOINT
  }

  const client = new SQSClient(clientConfig)
  const queues = new Map<string, Queue>()
  const queueUrls = new Map<string, string>()

  const getQueueUrl = async (name: string): Promise<string> => {
    let url = queueUrls.get(name)
    if (!url) {
      try {
        const command = new GetQueueUrlCommand({ QueueName: name })
        const result = await client.send(command)
        url = result.QueueUrl!
        queueUrls.set(name, url)
      } catch (error) {
        if (options?.autoCreateQueues && isQueueDoesNotExistError(error)) {
          logger.warn(
            `SQS queue "${name}" does not exist — auto-creating a standard queue (autoCreateQueues is enabled)`,
          )
          const created = await client.send(new CreateQueueCommand({ QueueName: name }))
          url = created.QueueUrl!
          queueUrls.set(name, url)
          return url
        }
        // Unlike the memory/redis bonds (which auto-create on first access),
        // SQS requires the queue to already exist in AWS — a typo'd name
        // fails LOUD here instead of silently going nowhere.
        logger.error(
          `SQS getQueueUrl error for queue "${name}" — the queue must already exist in AWS. Create it via createQueue(), the AWS console, or infrastructure-as-code, or pass { autoCreateQueues: true } to createProvider() to create it automatically:`,
          error,
        )
        throw error
      }
    }
    return url
  }

  return {
    queue(name: string): Queue {
      let q = queues.get(name)
      if (!q) {
        // We need the URL synchronously, so we create a lazy queue
        // that will fetch the URL on first operation
        const lazyQueue = createLazyQueue(client, name, () => getQueueUrl(name))
        queues.set(name, lazyQueue)
        q = lazyQueue
      }
      return q
    },

    async listQueues(): Promise<string[]> {
      const command = new ListQueuesCommand({})
      const result = await client.send(command)
      return (result.QueueUrls ?? []).map((url) => url.split('/').pop() ?? url)
    },

    async createQueue(name: string, queueOptions?: QueueCreateOptions): Promise<Queue> {
      const attributes: Record<string, string> = {}

      if (queueOptions?.visibilityTimeout) {
        attributes.VisibilityTimeout = String(queueOptions.visibilityTimeout)
      }

      if (queueOptions?.messageRetentionSeconds) {
        attributes.MessageRetentionPeriod = String(queueOptions.messageRetentionSeconds)
      }

      if (queueOptions?.maxMessageSize) {
        attributes.MaximumMessageSize = String(queueOptions.maxMessageSize)
      }

      if (queueOptions?.deadLetterQueue) {
        const dlqUrl = await getQueueUrl(queueOptions.deadLetterQueue.name)
        const dlqArnCommand = new GetQueueAttributesCommand({
          QueueUrl: dlqUrl,
          AttributeNames: ['QueueArn'],
        })
        const dlqResult = await client.send(dlqArnCommand)
        attributes.RedrivePolicy = JSON.stringify({
          deadLetterTargetArn: dlqResult.Attributes?.QueueArn,
          maxReceiveCount: queueOptions.deadLetterQueue.maxReceiveCount,
        })
      }

      const queueName = queueOptions?.fifo ? `${name}.fifo` : name

      const command = new CreateQueueCommand({
        QueueName: queueName,
        Attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
      })

      const result = await client.send(command)
      queueUrls.set(name, result.QueueUrl!)

      return this.queue(name)
    },

    async deleteQueue(name: string): Promise<void> {
      const url = await getQueueUrl(name)
      const command = new DeleteQueueCommand({ QueueUrl: url })
      await client.send(command)
      queues.delete(name)
      queueUrls.delete(name)
    },

    async close(): Promise<void> {
      client.destroy()
    },
  }
}

/** Lazily-initialized SQS queue provider, created on first property access via a Proxy. */
let _provider: QueueProvider | null = null

/**
 * Lazily-initialized SQS queue provider proxy that creates the provider on first access.
 */
export const provider: QueueProvider = new Proxy({} as QueueProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})

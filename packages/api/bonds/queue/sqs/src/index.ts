/**
 * AWS SQS queue provider for molecule.dev.
 *
 * Uses `AWS_REGION` (default `us-east-1`) with the standard AWS credential
 * chain; set `SQS_ENDPOINT` to target LocalStack. Queue URLs are resolved
 * lazily on first operation — the queue must already exist (create it with
 * `createQueue()` or in AWS) or the first send/receive rejects with the AWS
 * `QueueDoesNotExist` error. Pass `{ autoCreateQueues: true }` to
 * `createProvider()` to auto-create a standard queue on first use instead
 * (opt-in — unlike the memory/redis bonds, silently creating AWS resources
 * has cost/IAM implications, so it is never the default).
 *
 * @example
 * ```typescript
 * import { send, setProvider, subscribe } from '@molecule/api-queue'
 * import { createProvider } from '@molecule/api-queue-sqs'
 *
 * // Startup. Env: AWS_REGION + the standard AWS credential chain (AWS_ACCESS_KEY_ID /
 * // AWS_SECRET_ACCESS_KEY, or an IAM role). SQS_ENDPOINT only for LocalStack.
 * const sqs = createProvider({ region: process.env.AWS_REGION })
 * setProvider(sqs)
 *
 * // Queues must EXIST (here, or in IaC). The DLQ first — the redrive policy needs its ARN.
 * await sqs.createQueue?.('emails-dlq')
 * await sqs.createQueue?.('emails', {
 *   visibilityTimeout: 60, // seconds a received message stays hidden before a retry
 *   deadLetterQueue: { name: 'emails-dlq', maxReceiveCount: 5 },
 * })
 *
 * interface WelcomeEmailJob {
 *   to: string
 *   name: string
 * }
 * const greeted: string[] = []
 * // Long-polls (20 s); returning = ack (DeleteMessage); a throw = retry after visibilityTimeout.
 * const unsubscribe = subscribe<WelcomeEmailJob>('emails', async (message) => {
 *   greeted.push(`Welcome, ${message.body.name} <${message.body.to}>`)
 * })
 *
 * await send<WelcomeEmailJob>('emails', { body: { to: 'ada@example.com', name: 'Ada' } })
 * await send<WelcomeEmailJob>('emails', {
 *   body: { to: 'grace@example.com', name: 'Grace' },
 *   delaySeconds: 60, // SECONDS; SQS caps it at 900
 * })
 *
 * process.on('SIGTERM', () => {
 *   unsubscribe()
 *   void sqs.close?.()
 * })
 * ```
 *
 * @remarks
 * Delivery semantics (at-least-once — handlers must be idempotent):
 *
 * - **Handler success acks (deletes) automatically**; a handler throw leaves
 *   the message leased, and it returns to the queue when the visibility
 *   timeout expires (throw = retry). Bound poison messages with a redrive
 *   policy: `createQueue(name, { deadLetterQueue: { name, maxReceiveCount } })`.
 * - `ack()`/`nack()` settle at most once; `nack()` returns the message to the
 *   queue immediately (visibility timeout 0) instead of waiting out the lease.
 * - FIFO queues need the `.fifo` suffix (`createQueue(name, { fifo: true })`
 *   appends it) and a `groupId` per message; a `deduplicationId` is derived
 *   from the message id when not provided.
 * - `delaySeconds` is capped at 900 (15 minutes) by SQS itself.
 * - `subscribe()` retries a failed queue-URL resolution (bad region,
 *   credentials not yet propagated, a `QueueDoesNotExist` race) with bounded
 *   exponential backoff (1s → 30s) instead of logging once and leaving the
 *   subscription permanently dead — it self-heals once the queue/credentials
 *   become valid.
 * - **Runs behind an outbound proxy when `HTTPS_PROXY` is set.** The AWS SDK v3
 *   builds its own agent and reads no proxy variable, so on a host whose only
 *   egress path is a proxy every queue operation used to fail with a bare
 *   connection error. The client now gets a CONNECT-capable agent through its
 *   own `requestHandler` hook (`@molecule/api-proxy-agent`, resolved against
 *   `SQS_ENDPOINT` when set and the regional endpoint otherwise, so a LocalStack
 *   endpoint in `NO_PROXY` keeps connecting directly). With no proxy configured
 *   nothing is passed. Allowlist `*.amazonaws.com` on the proxy.
 *
 * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sqs/
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

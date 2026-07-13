/**
 * REAL-DEPENDENCY integration tests — no mocks: the actual in-memory queue
 * driven through the REAL `@molecule/api-queue` core accessor (`setProvider`,
 * `send`, `subscribe`), exactly the way a scaffolded app wires it.
 *
 * The unit suite (`index.test.ts`) exercises the provider object directly, so
 * it can never catch a break in the bond ↔ core seam (the accessor path every
 * consumer actually uses) — nor encode the consumer-experience properties a
 * weak executor debugs against:
 *
 * - Does the DEFAULT config survive a slow-but-legitimate handler (real work
 *   takes hundreds of ms — the default 30s lease must not redeliver mid-run)?
 * - Can a caller TELL failure modes apart? "No provider bonded", "queue
 *   closed", "redelivery of a transient failure", and "poison message
 *   exhausted its delivery cap" must each be distinguishable — an
 *   indistinguishable failure sent a real executor down a "the library is
 *   broken" spiral in the two-factor bond (see that package's exemplar test).
 *
 * @module
 */

import { afterAll, describe, expect, it, vi } from 'vitest'

import type { QueueProvider } from '@molecule/api-queue'
import { hasProvider, queue as getQueue, send, setProvider, subscribe } from '@molecule/api-queue'

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

describe('@molecule/api-queue-memory × REAL @molecule/api-queue core', () => {
  let providerInstance: QueueProvider

  afterAll(async () => {
    await providerInstance?.close?.()
  })

  it('FAILURE DISAMBIGUATION: an unbonded core fails with an actionable "not configured" error', async () => {
    // Must run BEFORE setProvider() below — file-scoped test order is the guard.
    expect(hasProvider()).toBe(false)
    await expect(send('emails', { body: { userId: 'u1' } })).rejects.toThrow(
      /not configured[\s\S]*setProvider/i,
    )
  })

  it('full lifecycle through the core accessor: bond → send → subscribe → auto-ack on success', async () => {
    providerInstance = createProvider()
    setProvider(providerInstance)
    expect(hasProvider()).toBe(true)

    const received: unknown[] = []
    // The core module's own @example returns from the handler WITHOUT calling
    // ack() — handler success must acknowledge, or every doc-following
    // consumer leaks/redelivers messages.
    const unsubscribe = subscribe<{ userId: string; kind: string }>('emails', async (message) => {
      received.push(message.body)
    })

    const id = await send('emails', { body: { userId: 'u1', kind: 'welcome' } })
    expect(typeof id).toBe('string')

    await waitFor(() => received.length === 1)
    expect(received[0]).toEqual({ userId: 'u1', kind: 'welcome' })

    const emails = getQueue('emails')
    await waitFor(async () => (await emails.size!()) === 0) // auto-ack settled
    unsubscribe()
  })

  it('CONSUMER PROPERTY: a slow (300ms) handler under DEFAULT settings runs exactly once', async () => {
    // The regression class this pins: a lease/tolerance shorter than a
    // realistic flow silently redelivers mid-run → double-processing (the
    // queue analog of the two-factor [30, 0] trap). Real handlers do DB
    // writes and external calls — 300ms is normal, and the default 30s
    // visibility lease must absorb it without a concurrent redelivery.
    const q = getQueue('slow-flow')
    let deliveries = 0
    const unsubscribe = q.subscribe(async () => {
      deliveries += 1
      await sleep(300)
    })

    await q.send({ body: { job: 'realistic-work' } })
    await waitFor(() => deliveries >= 1)
    await sleep(400) // enough time for a wrongful redelivery to have happened

    expect(deliveries).toBe(1)
    expect(await q.size!()).toBe(0)
    unsubscribe()
  })

  it('FAILURE DISAMBIGUATION: a redelivery is distinguishable from a first delivery (receiveCount)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const q = getQueue('transient')
    const seenCounts: Array<number | undefined> = []
    const unsubscribe = q.subscribe(async (message) => {
      seenCounts.push(message.receiveCount)
      if (seenCounts.length === 1) {
        throw new Error('transient failure — e.g. downstream 503')
      }
    })

    await q.send({ body: { attempt: 'me' } })
    await waitFor(() => seenCounts.length === 2)

    // The consumer-facing idempotency/dedupe signal: attempt 1 vs attempt 2
    // are labeled, so a handler can tell "first run" from "retry of a crash".
    expect(seenCounts).toEqual([1, 2])
    unsubscribe()
    vi.restoreAllMocks()
  })

  it('FAILURE DISAMBIGUATION: a poison message lands on the DLQ with its original id + body (not silently lost)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const work = await providerInstance.createQueue!('work', {
      deadLetterQueue: { name: 'work-dlq', maxReceiveCount: 2 },
    })
    const dlq = getQueue('work-dlq')

    let attempts = 0
    const unsubscribe = work.subscribe(async () => {
      attempts += 1
      throw new Error('permanently failing handler')
    })

    const id = await work.send({ body: { poison: true } })
    await waitFor(() => attempts === 2)

    await waitFor(async () => (await dlq.size!()) > 0)
    const [deadLettered] = await dlq.receive()
    expect(deadLettered.id).toBe(id) // traceable back to the original send
    expect(deadLettered.body).toEqual({ poison: true })
    expect(await work.size!()).toBe(0)
    unsubscribe()
    vi.restoreAllMocks()
  })

  it('FAILURE DISAMBIGUATION: sending to a deleted queue says "closed" — not "not configured"', async () => {
    const doomed = getQueue('doomed')
    await doomed.send({ body: 1 })
    await providerInstance.deleteQueue!('doomed')

    // Distinct from the unbonded error above: the provider is fine, THIS
    // queue is gone. An executor must not "fix" this by re-wiring bonds.
    await expect(doomed.send({ body: 2 })).rejects.toThrow(/closed/i)
    await expect(send('doomed', { body: 3 })).resolves.toBeDefined() // a fresh handle works
  })
})

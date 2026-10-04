/**
 * The Axiom ingest client: a bounded in-memory queue drained to Axiom's
 * ingest API in NDJSON batches. Shared by this package's analytics provider
 * and by `@molecule/api-logger-axiom`.
 *
 * @module
 */

import type { AxiomIngester, AxiomIngesterOptions, AxiomIngesterStats } from './types.js'

/** Default Axiom API origin (the dataset-path ingest endpoint lives here). */
export const AXIOM_DEFAULT_API_URL = 'https://api.axiom.co'

const WARN_INTERVAL_MS = 60_000

/**
 * JSON.stringify that survives what loggers and analytics callers pass in:
 * Errors become `{ name, message, stack }`, bigints become strings and cycles
 * become `"[Circular]"`.
 *
 * @param value - Any value.
 * @returns The JSON text, or null when it cannot be serialized.
 */
export function safeStringify(value: unknown): string | null {
  const seen = new WeakSet<object>()
  try {
    return JSON.stringify(value, (_key, v: unknown) => {
      if (typeof v === 'bigint') return v.toString()
      if (v instanceof Error) {
        const plain: Record<string, unknown> = { name: v.name, message: v.message, stack: v.stack }
        const cause = (v as { cause?: unknown }).cause
        if (cause !== undefined) plain.cause = cause
        return plain
      }
      if (v !== null && typeof v === 'object') {
        if (seen.has(v)) return '[Circular]'
        seen.add(v)
      }
      return v
    })
  } catch (_error) {
    // A throwing toJSON or getter: the caller drops this one event and counts it.
    return null
  }
}

/**
 * Builds the ingest URL for a dataset.
 *
 * @param dataset - The dataset name.
 * @param edgeUrl - Optional edge deployment base URL.
 * @returns The full ingest URL.
 */
export function axiomIngestUrl(dataset: string, edgeUrl?: string): string {
  const name = encodeURIComponent(dataset)
  const edge = edgeUrl?.trim().replace(/\/+$/, '')
  return edge ? `${edge}/v1/ingest/${name}` : `${AXIOM_DEFAULT_API_URL}/v1/datasets/${name}/ingest`
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    const t = setTimeout(resolve, ms)
    t.unref?.()
  })

/**
 * Creates an Axiom ingest client. Disabled (every call a no-op) unless both a
 * token and a dataset are configured.
 *
 * @param options - Ingest configuration; unset fields fall back to `AXIOM_*` env vars.
 * @returns The ingest client.
 */
export function createAxiomIngester(options: AxiomIngesterOptions = {}): AxiomIngester {
  const token = (options.token ?? process.env.AXIOM_TOKEN ?? '').trim()
  const dataset = (options.dataset ?? process.env.AXIOM_DATASET ?? '').trim()
  const orgId = (options.orgId ?? process.env.AXIOM_ORG_ID ?? '').trim()
  const edgeUrl = options.edgeUrl ?? process.env.AXIOM_EDGE_URL
  const enabled = token !== '' && dataset !== ''
  const flushIntervalMs = Math.max(50, options.flushIntervalMs ?? 2_000)
  const maxBatchEvents = Math.max(1, Math.min(10_000, options.maxBatchEvents ?? 500))
  const maxBatchBytes = Math.max(1_024, options.maxBatchBytes ?? 1_000_000)
  const maxQueueEvents = Math.max(1, options.maxQueueEvents ?? 10_000)
  const maxRetries = Math.max(0, options.maxRetries ?? 4)
  const retryBaseMs = Math.max(1, options.retryBaseMs ?? 500)
  const timeoutMs = Math.max(100, options.timeoutMs ?? 10_000)
  const stamp = options.stamp ?? {}
  const doFetch = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  const warnSink =
    options.warn ??
    ((message: string, detail?: Record<string, unknown>) => console.warn(message, detail ?? ''))

  const counters = { queued: 0, sent: 0, dropped: 0 }
  /** Serialized NDJSON lines waiting to be sent. */
  const queue: string[] = []
  let timer: ReturnType<typeof setInterval> | null = null
  let flushing: Promise<void> | null = null
  let closed = false
  const lastWarnAt = new Map<string, number>()

  const warn = (kind: string, message: string, detail?: Record<string, unknown>): void => {
    const at = Date.now()
    const last = lastWarnAt.get(kind)
    if (last !== undefined && at - last < WARN_INTERVAL_MS) return
    lastWarnAt.set(kind, at)
    try {
      warnSink(`Axiom ingest: ${message}`, { dataset, ...detail })
    } catch (_error) {
      // A throwing warn sink must not break the caller that queued the event.
    }
  }

  const url = enabled ? axiomIngestUrl(dataset, edgeUrl) : ''
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/x-ndjson',
  }
  if (orgId) headers['x-axiom-org-id'] = orgId

  /** Send one batch with retries. Returns true when Axiom acknowledged it. */
  const sendBatch = async (lines: string[]): Promise<boolean> => {
    const body = lines.join('\n')
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let retryable = true
      try {
        const response = await doFetch(url, {
          method: 'POST',
          headers,
          body,
          signal: AbortSignal.timeout(timeoutMs),
        })
        if (response.ok) {
          counters.sent += lines.length
          return true
        }
        retryable = response.status === 429 || response.status >= 500
        if (!retryable) {
          let detail = ''
          try {
            detail = (await response.text()).slice(0, 300)
          } catch (_error) {
            // The status alone is enough to act on.
          }
          warn(`http-${response.status}`, `Axiom refused a batch (${response.status})`, {
            status: response.status,
            detail,
            events: lines.length,
          })
        }
      } catch (error) {
        if (attempt === maxRetries) {
          warn('network', 'could not reach Axiom', {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
      if (!retryable) break
      if (attempt < maxRetries) await sleep(retryBaseMs * 2 ** attempt)
    }
    counters.dropped += lines.length
    if (maxRetries > 0) warn('retries', 'dropped a batch after retries', { events: lines.length })
    return false
  }

  /** Take the next batch off the front of the queue, within the event and byte caps. */
  const takeBatch = (): string[] => {
    const lines: string[] = []
    let bytes = 0
    while (queue.length > 0 && lines.length < maxBatchEvents) {
      const next = queue[0]
      const size = Buffer.byteLength(next) + 1
      if (lines.length > 0 && bytes + size > maxBatchBytes) break
      queue.shift()
      lines.push(next)
      bytes += size
    }
    return lines
  }

  const drain = async (): Promise<void> => {
    while (queue.length > 0) {
      const ok = await sendBatch(takeBatch())
      // One batch out of retries means Axiom is unreachable right now: stop and
      // let the next tick try again rather than burning through the queue.
      if (!ok) return
    }
  }

  const flush = (): Promise<void> => {
    if (!enabled) return Promise.resolve()
    if (flushing) return flushing
    flushing = drain()
      .catch((error: unknown) => {
        warn('flush', 'flush failed', {
          error: error instanceof Error ? error.message : String(error),
        })
      })
      .finally(() => {
        flushing = null
      })
    return flushing
  }

  const ensureTimer = (): void => {
    if (timer || closed) return
    timer = setInterval(() => {
      void flush()
    }, flushIntervalMs)
    timer.unref?.()
  }

  return {
    enabled,
    dataset: enabled ? dataset : null,
    ingest(event: Record<string, unknown>): void {
      if (!enabled) return
      try {
        let doc: Record<string, unknown> | null = { ...stamp, ...event }
        if (doc._time === undefined) doc._time = new Date().toISOString()
        if (options.beforeSend) doc = options.beforeSend(doc)
        if (!doc) return
        if (queue.length >= maxQueueEvents) {
          counters.dropped++
          warn('queue-full', `queue full (${maxQueueEvents} events); dropping events`)
          return
        }
        const line = safeStringify(doc)
        if (line === null) {
          counters.dropped++
          warn('unserializable', 'dropped an event that could not be serialized')
          return
        }
        if (Buffer.byteLength(line) + 1 > maxBatchBytes) {
          counters.dropped++
          warn('oversized', `dropped an event larger than ${maxBatchBytes} bytes`)
          return
        }
        queue.push(line)
        counters.queued++
        ensureTimer()
        if (queue.length >= maxBatchEvents) void flush()
      } catch (error) {
        counters.dropped++
        warn('ingest', 'could not queue an event', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    },
    flush,
    async shutdown(): Promise<void> {
      closed = true
      if (timer) clearInterval(timer)
      timer = null
      if (flushing) await flushing
      await flush()
    },
    stats(): AxiomIngesterStats {
      return { ...counters, pending: queue.length }
    },
  }
}

/**
 * Types for the Axiom analytics provider and its ingest client.
 *
 * @module
 */

import type { AnalyticsProvider } from '@molecule/api-analytics'

/** Options for {@link createAxiomIngester}. Every field is optional. */
export interface AxiomIngesterOptions {
  /** Axiom API token. Defaults to `$AXIOM_TOKEN`. No token → the ingester is disabled (a silent no-op). */
  token?: string
  /** Target dataset. Defaults to `$AXIOM_DATASET`. No dataset → disabled. */
  dataset?: string
  /** Org id, sent as `X-Axiom-Org-Id` (needed for personal tokens only). Defaults to `$AXIOM_ORG_ID`. */
  orgId?: string
  /**
   * Edge deployment base URL (e.g. `https://eu-central-1.aws.edge.axiom.co`).
   * Defaults to `$AXIOM_EDGE_URL`. When set, events go to `<edge>/v1/ingest/<dataset>`;
   * otherwise to `https://api.axiom.co/v1/datasets/<dataset>/ingest`.
   */
  edgeUrl?: string
  /** Fields stamped onto every event (e.g. `service`, `env`, `region`, `version`). Event fields win on conflict. */
  stamp?: Record<string, unknown>
  /** Flush period in ms (default 2000). */
  flushIntervalMs?: number
  /** Most events per request (default 500). A full batch flushes immediately. */
  maxBatchEvents?: number
  /** Most bytes per request body (default 1_000_000). A single larger event is dropped. */
  maxBatchBytes?: number
  /** Most events held in memory (default 10_000). Further events are dropped. */
  maxQueueEvents?: number
  /**
   * Retries per batch after the first attempt, for network errors, 429 and 5xx (default 4).
   * A 429/503 with `Retry-After` waits that long (at most 60 s) instead of the backoff.
   */
  maxRetries?: number
  /** First retry delay in ms; doubles per attempt (default 500). */
  retryBaseMs?: number
  /** Per-request timeout in ms (default 10_000). */
  timeoutMs?: number
  /** Transform applied to each event before it is queued (e.g. secret redaction). Return null to drop it. */
  beforeSend?: (event: Record<string, unknown>) => Record<string, unknown> | null
  /** Injected fetch (tests). Defaults to the global `fetch`. */
  fetch?: typeof fetch
  /** Where throttled warnings go (default `console.warn`). Never routed through a logger bond, so a logger mirror cannot loop. */
  warn?: (message: string, detail?: Record<string, unknown>) => void
}

/** Running counters, for health reporting and tests. */
export interface AxiomIngesterStats {
  /** Events accepted into the queue. */
  queued: number
  /** Events Axiom stored (a 200 can report some events of a batch as failed; those are not sent). */
  sent: number
  /**
   * Events dropped (queue full, oversized, unserializable, rejected, failed inside an
   * acknowledged batch, out of retries, or ingested after `shutdown()`).
   */
  dropped: number
  /** Events waiting in memory right now. */
  pending: number
}

/** An Axiom ingest client. */
export interface AxiomIngester {
  /** Whether a token and dataset are configured. When false every method is a no-op. */
  readonly enabled: boolean
  /** The dataset events go to, or null when disabled. */
  readonly dataset: string | null
  /** Queue one event. Synchronous, never throws, never waits on the network. After `shutdown()` it only counts the event as dropped. */
  ingest(event: Record<string, unknown>): void
  /** Send everything queued now. Resolves when the queue is drained or a batch has exhausted its retries. */
  flush(): Promise<void>
  /**
   * Stop the timer and drain what is left within a total budget (`deadlineMs`, default 5000):
   * each remaining batch gets one attempt (no retries) and no request outlives the budget. Events
   * still queued when it runs out are counted as dropped and reported in one warning with the
   * pending count.
   */
  shutdown(options?: { deadlineMs?: number }): Promise<void>
  /** Current counters. */
  stats(): AxiomIngesterStats
}

/** Options for {@link createProvider}. Same as the ingester's, plus the stamped identity fields. */
export interface AxiomAnalyticsOptions extends AxiomIngesterOptions {
  /** Stamped as `service` on every event (e.g. `molecule-api`). */
  service?: string
  /** Stamped as `env`. Defaults to `$NODE_ENV`. */
  env?: string
  /** Stamped as `region` (e.g. the Fly region). */
  region?: string
  /** Stamped as `version` (release or commit). */
  version?: string
}

/** An analytics provider backed by Axiom, with its ingester's lifecycle exposed. */
export interface AxiomAnalyticsProvider extends AnalyticsProvider {
  /** Whether a token and dataset are configured. When false every call is a no-op. */
  readonly enabled: boolean
  /** The dataset events go to, or null when disabled. */
  readonly dataset: string | null
  /** Records a group association as a `group` event. */
  group(groupId: string, traits?: Record<string, unknown>): Promise<void>
  /** Send everything queued now. */
  flush(): Promise<void>
  /** Stop the flush timer and send what is left. Call before the process exits. */
  shutdown(): Promise<void>
  /** Queue/sent/dropped counters. */
  stats(): AxiomIngesterStats
}

/**
 * Pure helpers backing the `/cost` command card.
 *
 * The card renders what `GET /projects/:id/chat-usage` returns for the current
 * conversation. The one thing that is NOT obvious from the payload — and that
 * made the card look broken next to a provider dashboard — is what
 * `inputTokens` means:
 *
 * - Every AI bond normalizes usage into **disjoint** buckets: `inputTokens`
 *   (uncached prompt), `cacheReadInputTokens` (cache hits) and
 *   `cacheCreationInputTokens` (cache writes). On OpenAI-compatible APIs
 *   (DeepSeek, Alibaba, Moonshot) the wire format is the opposite — `prompt_tokens`
 *   is the TOTAL and `prompt_tokens_details.cached_tokens` is a subset of it — so
 *   those bonds subtract before reporting. Anthropic already reports them
 *   separately and nothing is subtracted.
 * - A provider's usage dashboard reports **total tokens processed**, cache hits
 *   included. So `inputTokens` alone is not comparable to it, and in a long
 *   agentic turn (where each iteration replays the whole conversation against a
 *   warm cache) the cached share is the overwhelming majority of the volume.
 *
 * {@link totalPromptTokens} is therefore the figure to compare against a provider
 * dashboard, and {@link formatTokenTotal} is the shared abbreviation used on the
 * card. Both are deterministic and side-effect free so they can be unit tested
 * without rendering or a real backend; the component supplies `t()`.
 *
 * @module
 */

/** The usage-shaped subset of `GET /projects/:id/chat-usage` the cost card reads. */
export interface ChatUsageTokens {
  /** Uncached prompt tokens. NOT the provider's `prompt_tokens` — cache hits are excluded. */
  inputTokens: number
  /** Generated tokens. */
  outputTokens: number
  /** Prompt tokens served from the provider's cache. */
  cacheReadInputTokens?: number
  /** Prompt tokens written into the provider's cache. */
  cacheCreationInputTokens?: number
}

/**
 * Abbreviate a token count for display (`1.2M`, `340.5K`, `812`).
 *
 * @param n - The token count.
 * @returns The abbreviated string.
 */
export function formatTokenTotal(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
}

/**
 * Total CACHED prompt tokens — reads plus writes.
 *
 * @param usage - The usage payload.
 * @returns The combined cached-token count (0 when the provider reports none).
 */
export function cachedPromptTokens(usage: ChatUsageTokens): number {
  const read = usage.cacheReadInputTokens ?? 0
  const write = usage.cacheCreationInputTokens ?? 0
  return (Number.isFinite(read) ? read : 0) + (Number.isFinite(write) ? write : 0)
}

/**
 * Total prompt tokens the provider actually processed — uncached + cached. This
 * is the figure that lines up with a provider usage dashboard; `inputTokens` on
 * its own does not, because the bonds report the buckets disjointly.
 *
 * @param usage - The usage payload.
 * @returns Uncached input plus every cached prompt token.
 */
export function totalPromptTokens(usage: ChatUsageTokens): number {
  const input = Number.isFinite(usage.inputTokens) ? usage.inputTokens : 0
  return input + cachedPromptTokens(usage)
}

/**
 * A summary cache kept in one JSON file, keyed by a hash of the text and the
 * caps — so an unchanged text is never summarized twice, across builds.
 *
 * Works with any bonded `ai-summarization` provider.
 *
 * @module
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import type {
  AISummarizationProvider,
  SummarizeInput,
  SummarizeResult,
} from '@molecule/api-ai-summarization'
import { requireProvider } from '@molecule/api-ai-summarization'

/** One cached summary. */
export interface CachedSummary {
  summary: string
  withinCap?: boolean
}

/** The cache: a key → summary map persisted to a JSON file. */
export interface SummaryCache {
  /** The file the cache reads and writes. */
  readonly file: string
  get(key: string): CachedSummary | undefined
  set(key: string, value: CachedSummary): void
  /** Every entry, e.g. to publish them as a static file. */
  entries(): Record<string, CachedSummary>
  /** Writes the file (creating its directory). */
  save(): void
}

/**
 * The cache key for a request: a SHA-256 of the text (whitespace-normalized)
 * and every option that changes the answer.
 *
 * @param input - The summarize request.
 * @returns A 64-char hex key.
 */
export function summaryKey(input: SummarizeInput): string {
  const basis = JSON.stringify([
    input.text.replace(/\s+/g, ' ').trim(),
    input.maxWords ?? null,
    input.sentences ?? null,
    input.maxLength ?? null,
    input.format ?? null,
    input.focus ?? null,
    input.model ?? null,
  ])
  return createHash('sha256').update(basis).digest('hex')
}

/**
 * Opens (or starts) a summary cache stored at `file`.
 *
 * @param file - Path of the JSON file, e.g. `.cache/summaries.json`.
 * @returns The cache.
 */
export function createFileSummaryCache(file: string): SummaryCache {
  let data: Record<string, CachedSummary> = {}
  if (existsSync(file)) {
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as {
        entries?: Record<string, CachedSummary>
      }
      data = parsed.entries ?? {}
    } catch (_error) {
      // A corrupt cache file is a cold cache: every text is summarized again and save() rewrites it.
      data = {}
    }
  }
  return {
    file,
    get: (key) => data[key],
    set: (key, value) => {
      data[key] = value
    },
    entries: () => ({ ...data }),
    save: () => {
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, JSON.stringify({ version: 1, entries: data }, null, 2) + '\n')
    },
  }
}

/**
 * Summarize through the cache: a hit returns without a model call; a miss
 * summarizes and stores the result. A summary that did not meet its caps
 * (`withinCap: false`) is returned but not stored, so the next run tries again.
 *
 * @param input - The summarize request.
 * @param options - The cache, and optionally a provider (defaults to the bonded one).
 * @param options.cache - The cache to read and fill.
 * @param options.summarizer - A provider to use instead of the bonded one.
 * @returns The result, with `cached: true` on a hit and `key` for publishing.
 */
export async function summarizeCached(
  input: SummarizeInput,
  options: { cache: SummaryCache; summarizer?: AISummarizationProvider },
): Promise<SummarizeResult & { cached: boolean; key: string }> {
  const key = summaryKey(input)
  const hit = options.cache.get(key)
  if (hit) return { ...hit, cached: true, key }
  const result = await (options.summarizer ?? requireProvider()).summarize(input)
  if (result.withinCap !== false && result.summary) {
    options.cache.set(key, { summary: result.summary, withinCap: result.withinCap })
  }
  return { ...result, cached: false, key }
}

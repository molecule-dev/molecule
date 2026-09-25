import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import type { AISummarizationProvider } from '@molecule/api-ai-summarization'

import { createFileSummaryCache, summarizeCached, summaryKey } from '../cache.js'

describe('summary cache', () => {
  const file = () => join(mkdtempSync(join(tmpdir(), 'mol-sum-')), 'nested', 'summaries.json')

  it('keys ignore whitespace changes and include the caps', () => {
    const a = summaryKey({ text: 'Hello   world', maxWords: 25 })
    expect(summaryKey({ text: ' Hello world\n', maxWords: 25 })).toBe(a)
    expect(summaryKey({ text: 'Hello world', maxWords: 20 })).not.toBe(a)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it('a miss calls the provider and stores; a hit does not call it; save/reopen round-trips', async () => {
    const f = file()
    const summarize = vi.fn(async () => ({ summary: 'It works.', withinCap: true }))
    const summarizer: AISummarizationProvider = { name: 'fake', summarize }
    const cache = createFileSummaryCache(f)
    const first = await summarizeCached({ text: 'long text', maxWords: 25 }, { cache, summarizer })
    expect(first).toMatchObject({ summary: 'It works.', cached: false })
    const second = await summarizeCached({ text: 'long text', maxWords: 25 }, { cache, summarizer })
    expect(second).toMatchObject({ summary: 'It works.', cached: true, key: first.key })
    expect(summarize).toHaveBeenCalledTimes(1)
    cache.save()
    expect(JSON.parse(readFileSync(f, 'utf8')).version).toBe(1)
    expect(createFileSummaryCache(f).get(first.key)?.summary).toBe('It works.')
  })

  it('does not store a summary that missed its caps', async () => {
    const cache = createFileSummaryCache(file())
    const summarizer: AISummarizationProvider = {
      name: 'fake',
      summarize: async () => ({ summary: 'Too long a sentence.', withinCap: false }),
    }
    const r = await summarizeCached({ text: 't', maxWords: 2 }, { cache, summarizer })
    expect(r.withinCap).toBe(false)
    expect(cache.entries()).toEqual({})
  })
})

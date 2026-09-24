/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the Anthropic bond. Only the
 * network is mocked: `fetch` returns a real Messages-API SSE stream.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setProvider } from '@molecule/api-ai'
import { createProvider } from '@molecule/api-ai-anthropic'

import type { ExtractionField } from '../index.js'
import { extractFields, missingRequiredFields } from '../index.js'

/**
 * Builds a streaming fetch Response whose SSE stream yields `text` as one text block.
 *
 * @param text - The model's full reply text.
 * @returns A minimal streaming Response.
 */
function sseTextResponse(text: string): Response {
  const events: Array<Record<string, unknown>> = [
    { type: 'message_start', message: { usage: { input_tokens: 40 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } },
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', usage: { output_tokens: 30 } },
    { type: 'message_stop' },
  ]
  const body = events.map((e) => `data: ${JSON.stringify(e)}`).join('\n') + '\n'
  return new Response(new TextEncoder().encode(body), {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('extracts the declared fields through the bonded AI provider', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    const reply = JSON.stringify({
      data: {
        invoice_number: 'INV-2041',
        total_amount: 125000,
        due_date: '2026-10-01',
        vendor: 'ACME Corp',
      },
      confidence: { invoice_number: 0.98, total_amount: 0.95 },
      reasoning: 'Found in header and totals line.',
    })
    const fetchMock = vi.fn(async () => sseTextResponse(reply))
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ apiKey: process.env.ANTHROPIC_API_KEY }))

    const invoiceText = 'ACME Corp — Invoice INV-2041. Total due: $1,250.00 by 2026-10-01.'
    const fields: ExtractionField[] = [
      {
        name: 'invoice_number',
        type: 'string',
        required: true,
        description: 'The invoice ID/number',
      },
      { name: 'total_amount', type: 'number', required: true, description: 'Total due in cents' },
      { name: 'due_date', type: 'date', description: 'Payment due date (YYYY-MM-DD)' },
      { name: 'vendor', type: 'string', description: 'Vendor / supplier name' },
    ]

    const result = await extractFields<{ invoice_number: string; total_amount: number }>({
      text: invoiceText,
      fields,
      context: 'Invoice from a B2B vendor',
    })
    const missing = missingRequiredFields(result, fields)

    expect(missing).toEqual([])
    expect(result.data.invoice_number).toBe('INV-2041')
    expect(result.data.total_amount).toBe(125000)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(init.body as string) as { messages: Array<{ content: string }> }
    expect(body.messages[0]?.content).toContain(invoiceText)
    expect(body.messages[0]?.content).toContain('"invoice_number" (string) (REQUIRED)')
  })

  it('reports missing required fields instead of throwing', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        sseTextResponse('{"data":{"invoice_number":"INV-2041","total_amount":null}}'),
      ),
    )
    setProvider(createProvider({ apiKey: process.env.ANTHROPIC_API_KEY }))

    const fields: ExtractionField[] = [
      {
        name: 'invoice_number',
        type: 'string',
        required: true,
        description: 'The invoice ID/number',
      },
      { name: 'total_amount', type: 'number', required: true, description: 'Total due in cents' },
    ]
    const result = await extractFields({ text: 'Invoice INV-2041', fields })
    expect(missingRequiredFields(result, fields)).toEqual(['total_amount'])
  })
})

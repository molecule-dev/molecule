const { mockRequireAI, mockChat } = vi.hoisted(() => ({
  mockRequireAI: vi.fn(),
  mockChat: vi.fn(),
}))

vi.mock('@molecule/api-ai', () => ({
  requireProvider: mockRequireAI,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { extractFields, missingRequiredFields } from '../pipeline.js'
import type { ExtractionField } from '../types.js'

function streamChunks(chunks: string[]) {
  return {
    async *[Symbol.asyncIterator]() {
      // Real ChatEvent text payload is `content` (see @molecule/api-ai types).
      for (const text of chunks) yield { type: 'text', content: text }
    },
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockRequireAI.mockReturnValue({ chat: mockChat })
})

const FIELDS: ExtractionField[] = [
  { name: 'invoice_number', description: 'The invoice number', type: 'string', required: true },
  { name: 'total', description: 'Total amount', type: 'number', required: true },
  { name: 'notes', description: 'Free-form notes', type: 'string' },
]

describe('extractFields', () => {
  it('parses a well-formed JSON response', async () => {
    mockChat.mockReturnValue(
      streamChunks([
        '{"data":{"invoice_number":"INV-1","total":100,"notes":"x"},"confidence":{"invoice_number":0.99},"reasoning":"r"}',
      ]),
    )
    const out = await extractFields({ text: 'doc', fields: FIELDS })
    expect(out.data).toEqual({ invoice_number: 'INV-1', total: 100, notes: 'x' })
    expect(out.confidence?.invoice_number).toBeCloseTo(0.99)
    expect(out.reasoning).toBe('r')
  })

  it('strips ```json fences before parsing', async () => {
    mockChat.mockReturnValue(
      streamChunks(['```json\n{"data":{"invoice_number":"INV-2"},"reasoning":"r"}\n```']),
    )
    const out = await extractFields({ text: 'doc', fields: FIELDS })
    expect(out.data.invoice_number).toBe('INV-2')
  })

  it('returns empty data + diagnostic when JSON is malformed', async () => {
    mockChat.mockReturnValue(streamChunks(['totally not json']))
    const out = await extractFields({ text: 'doc', fields: FIELDS })
    expect(out.data).toEqual({})
    expect(out.reasoning).toBe('AI returned malformed JSON')
  })

  it('includes each field name + type + description in the prompt', async () => {
    mockChat.mockReturnValue(streamChunks(['{"data":{}}']))
    await extractFields({ text: 'doc', fields: FIELDS })
    const prompt = mockChat.mock.calls[0][0].messages[0].content
    expect(prompt).toContain('"invoice_number"')
    expect(prompt).toContain('(string)')
    expect(prompt).toContain('Total amount')
  })

  it('marks required fields as (REQUIRED) in the prompt', async () => {
    mockChat.mockReturnValue(streamChunks(['{"data":{}}']))
    await extractFields({ text: 'doc', fields: FIELDS })
    const prompt = mockChat.mock.calls[0][0].messages[0].content
    const invLine = prompt.split('\n').find((l: string) => l.includes('invoice_number'))
    expect(invLine).toContain('(REQUIRED)')
    const notesLine = prompt.split('\n').find((l: string) => l.includes('"notes"'))
    expect(notesLine).not.toContain('(REQUIRED)')
  })

  it('includes the document text in the prompt', async () => {
    mockChat.mockReturnValue(streamChunks(['{"data":{}}']))
    await extractFields({ text: 'INVOICE BODY HERE', fields: FIELDS })
    expect(mockChat.mock.calls[0][0].messages[0].content).toContain('INVOICE BODY HERE')
  })

  it('appends context block when provided', async () => {
    mockChat.mockReturnValue(streamChunks(['{"data":{}}']))
    await extractFields({ text: 'doc', fields: FIELDS, context: 'a vendor invoice' })
    expect(mockChat.mock.calls[0][0].messages[0].content).toContain(
      'Document context: a vendor invoice',
    )
  })

  it('passes temperature=0 by default for deterministic extraction', async () => {
    mockChat.mockReturnValue(streamChunks(['{"data":{}}']))
    await extractFields({ text: 'doc', fields: FIELDS })
    expect(mockChat.mock.calls[0][0].temperature).toBe(0)
  })

  it('honours explicit temperature + model overrides', async () => {
    mockChat.mockReturnValue(streamChunks(['{"data":{}}']))
    await extractFields({ text: 'doc', fields: FIELDS, temperature: 0.5, model: 'm-x' })
    expect(mockChat.mock.calls[0][0].temperature).toBe(0.5)
    expect(mockChat.mock.calls[0][0].model).toBe('m-x')
  })

  it('ignores non-text events in the AI stream', async () => {
    mockChat.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        yield { type: 'tool_use', name: 'x' }
        yield { type: 'text', content: '{"data":{"invoice_number":"INV-9"}}' }
      },
    })
    const out = await extractFields({ text: 'doc', fields: FIELDS })
    expect(out.data.invoice_number).toBe('INV-9')
  })
})

describe('missingRequiredFields', () => {
  it('returns names of required fields with null values', () => {
    const missing = missingRequiredFields(
      { data: { invoice_number: 'INV-1', total: null, notes: 'note' } },
      FIELDS,
    )
    expect(missing).toEqual(['total'])
  })

  it('returns names of required fields that are undefined', () => {
    const missing = missingRequiredFields({ data: { invoice_number: 'INV-1' } }, FIELDS)
    expect(missing).toContain('total')
    expect(missing).not.toContain('invoice_number')
  })

  it('does NOT flag optional fields even if missing', () => {
    const missing = missingRequiredFields({ data: { invoice_number: 'X', total: 10 } }, FIELDS)
    expect(missing).toEqual([])
  })

  it('returns [] when all required fields are present and non-null', () => {
    const missing = missingRequiredFields(
      { data: { invoice_number: 'X', total: 10, notes: 'n' } },
      FIELDS,
    )
    expect(missing).toEqual([])
  })

  it('returns [] when no fields are marked required', () => {
    const noRequired: ExtractionField[] = [
      { name: 'a', description: 'a', type: 'string' },
      { name: 'b', description: 'b', type: 'string' },
    ]
    expect(missingRequiredFields({ data: {} }, noRequired)).toEqual([])
  })
})

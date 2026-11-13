/**
 * Tests for the AWS Textract OCR provider.
 *
 * The AWS SDK is mocked: unit tests prove the bond's own behavior (validation
 * before any upstream call, result assembly, error tracking); live recognition
 * is proven against the real API.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockSend = vi.fn()
const mockTrackBondFailure = vi.fn()

vi.mock('@aws-sdk/client-textract', () => ({
  TextractClient: vi.fn(function () {
    return { send: mockSend }
  }),
  DetectDocumentTextCommand: vi.fn(function (input: unknown) {
    return { input, type: 'DetectDocumentTextCommand' }
  }),
}))
vi.mock('@molecule/api-analytics', () => ({
  trackBondFailure: (...args: unknown[]) => mockTrackBondFailure(...args),
}))
vi.mock('@molecule/api-proxy-agent', () => ({
  getProxyAgents: vi.fn(() => undefined),
}))

import { DetectDocumentTextCommand, TextractClient } from '@aws-sdk/client-textract'

import { createProvider, resolveRegion } from '../provider.js'

/** One Textract LINE block. */
function line(text: string, confidence: number): Record<string, unknown> {
  return { BlockType: 'LINE', Text: text, Confidence: confidence }
}

const PNG = { data: new Uint8Array([1, 2, 3]), mimeType: 'image/png' }

beforeEach(() => {
  vi.clearAllMocks()
  mockSend.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('api-ocr-textract', () => {
  it('joins LINE blocks in order and scores the page with their mean confidence', async () => {
    mockSend.mockResolvedValue({
      Blocks: [
        { BlockType: 'PAGE' },
        line('INVOICE #42', 99),
        line('TOTAL 42.00 EUR', 90),
        { BlockType: 'WORD', Text: 'INVOICE', Confidence: 99 },
      ],
    })
    const result = await createProvider().recognize(PNG)
    expect(result).toEqual({
      text: 'INVOICE #42\nTOTAL 42.00 EUR',
      pages: [{ pageNumber: 1, text: 'INVOICE #42\nTOTAL 42.00 EUR', confidence: 0.945 }],
    })
  })

  it('returns empty text and no confidence when Textract finds no lines', async () => {
    mockSend.mockResolvedValue({ Blocks: [{ BlockType: 'PAGE' }] })
    const result = await createProvider().recognize(PNG)
    expect(result).toEqual({
      text: '',
      pages: [{ pageNumber: 1, text: '', confidence: undefined }],
    })
  })

  it('passes the image bytes to DetectDocumentText and ignores the language hint', async () => {
    mockSend.mockResolvedValue({ Blocks: [] })
    await createProvider().recognize(PNG, { language: 'de' })
    expect(DetectDocumentTextCommand).toHaveBeenCalledWith({ Document: { Bytes: PNG.data } })
  })

  it('refuses a non-PNG/JPEG image before any upstream call', async () => {
    for (const mimeType of ['image/webp', 'image/tiff', 'application/pdf', 'image/gif']) {
      await expect(
        createProvider().recognize({ data: new Uint8Array([1]), mimeType }),
      ).rejects.toThrow(/PNG or JPEG/)
    }
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('accepts the image/jpg alias', async () => {
    mockSend.mockResolvedValue({ Blocks: [] })
    await expect(
      createProvider().recognize({ data: new Uint8Array([1]), mimeType: 'image/jpg' }),
    ).resolves.toMatchObject({ text: '' })
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('refuses an image over 5 MB before any upstream call', async () => {
    const oversized = new Uint8Array(5 * 1024 * 1024 + 1)
    await expect(
      createProvider().recognize({ data: oversized, mimeType: 'image/png' }),
    ).rejects.toThrow(/5 MB/)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('tracks a failed send through trackBondFailure and rethrows', async () => {
    const failure = new Error('ThrottlingException')
    mockSend.mockRejectedValue(failure)
    await expect(createProvider().recognize(PNG)).rejects.toThrow('ThrottlingException')
    expect(mockTrackBondFailure).toHaveBeenCalledWith({
      bond: 'ocr-textract',
      operation: 'recognize',
      error: failure,
    })
  })

  it('builds one client per provider and reuses it across calls', async () => {
    mockSend.mockResolvedValue({ Blocks: [] })
    const provider = createProvider()
    await provider.recognize(PNG)
    await provider.recognize(PNG)
    expect(TextractClient).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledTimes(2)
  })

  it('resolves the region from config, then AWS_TEXTRACT_REGION, then AWS_REGION, then the default', () => {
    vi.stubEnv('AWS_TEXTRACT_REGION', 'eu-central-1')
    vi.stubEnv('AWS_REGION', 'us-west-2')
    expect(resolveRegion()).toBe('eu-central-1')
    vi.stubEnv('AWS_TEXTRACT_REGION', '')
    expect(resolveRegion()).toBe('us-west-2')
    vi.stubEnv('AWS_REGION', '')
    expect(resolveRegion()).toBe('us-east-1')
    expect(resolveRegion({ region: 'ap-south-1' })).toBe('ap-south-1')
  })

  it('passes an explicit endpoint and credentials to the client', async () => {
    mockSend.mockResolvedValue({ Blocks: [] })
    await createProvider({
      region: 'eu-west-3',
      endpoint: 'https://textract.example.test',
      credentials: { accessKeyId: 'AKIA-test', secretAccessKey: 'secret' },
    }).recognize(PNG)
    expect(TextractClient).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'eu-west-3',
        credentials: { accessKeyId: 'AKIA-test', secretAccessKey: 'secret' },
        endpoint: 'https://textract.example.test',
      }),
    )
  })
})

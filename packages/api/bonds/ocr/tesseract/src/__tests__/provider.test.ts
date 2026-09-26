import { beforeEach, describe, expect, it, vi } from 'vitest'

// Factory mock: the real tesseract.js never loads (it is a heavy WASM package
// and the traineddata download is network I/O — unit tests prove the bond's
// own behavior, live recognition is proven against the real library).
vi.mock('tesseract.js', () => ({ createWorker: vi.fn() }))

import { createWorker } from 'tesseract.js'

import { createProvider } from '../provider.js'

const recognize = vi.fn()
const terminate = vi.fn()

/** One fake worker. */
function fakeWorker() {
  return { recognize, terminate }
}

const IMAGE = { data: new Uint8Array([1, 2, 3]), mimeType: 'image/png' }

beforeEach(() => {
  vi.mocked(createWorker).mockReset()
  recognize.mockReset()
  terminate.mockReset()
  recognize.mockResolvedValue({
    data: { text: 'HELLO\n', confidence: 92, blocks: [] },
  })
  terminate.mockResolvedValue(undefined)
})

describe('api-ocr-tesseract', () => {
  it('returns Tesseract text and its confidence on a 0–1 scale', async () => {
    vi.mocked(createWorker).mockResolvedValue(fakeWorker() as never)
    const result = await createProvider().recognize(IMAGE)
    expect(result).toEqual({
      text: 'HELLO\n',
      pages: [{ pageNumber: 1, text: 'HELLO\n', confidence: 0.92 }],
    })
  })

  it('passes the image bytes and defaults the language to eng', async () => {
    vi.mocked(createWorker).mockResolvedValue(fakeWorker() as never)
    await createProvider().recognize(IMAGE)
    expect(createWorker).toHaveBeenCalledWith('eng', 1, {})
    expect(recognize).toHaveBeenCalledWith(Buffer.from([1, 2, 3]))
  })

  it('reuses one worker per language, and a call can override it', async () => {
    vi.mocked(createWorker).mockResolvedValue(fakeWorker() as never)
    const provider = createProvider()
    await provider.recognize(IMAGE)
    await provider.recognize(IMAGE, { language: 'eng+deu' })
    await provider.recognize(IMAGE)
    expect(createWorker).toHaveBeenCalledTimes(2)
    expect(createWorker).toHaveBeenNthCalledWith(2, 'eng+deu', 1, {})
  })

  it('does not cache a failed worker creation — the next call retries', async () => {
    vi.mocked(createWorker)
      .mockRejectedValueOnce(new Error('traineddata download failed'))
      .mockResolvedValue(fakeWorker() as never)
    const provider = createProvider()
    await expect(provider.recognize(IMAGE)).rejects.toThrow('traineddata download failed')
    await provider.recognize(IMAGE)
    expect(createWorker).toHaveBeenCalledTimes(2)
  })

  it('dispose terminates every worker it started', async () => {
    vi.mocked(createWorker).mockResolvedValue(fakeWorker() as never)
    const provider = createProvider()
    await provider.recognize(IMAGE)
    await provider.recognize(IMAGE, { language: 'deu' })
    await provider.dispose()
    expect(terminate).toHaveBeenCalledTimes(2)
  })
})

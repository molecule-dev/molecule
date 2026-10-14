import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ScreenshotProvider } from '@molecule/api-screenshots'

/**
 * A tiny valid PNG (1×1 transparent pixel header) — what a capture returns.
 */
const PNG_BYTES = Buffer.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0,
  0, 31, 21, 196, 137,
])

vi.mock('puppeteer', () => {
  const pngBytes = Buffer.from([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0,
    0, 0, 31, 21, 196, 137,
  ])
  const page = {
    setDefaultTimeout: vi.fn(),
    setViewport: vi.fn().mockResolvedValue(undefined),
    goto: vi.fn().mockResolvedValue(null),
    setContent: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue(2400),
    screenshot: vi.fn().mockResolvedValue(new Uint8Array(pngBytes)),
    close: vi.fn().mockResolvedValue(undefined),
  }
  const browser = {
    newPage: vi.fn().mockResolvedValue(page),
    close: vi.fn().mockResolvedValue(undefined),
    connected: true,
  }
  return {
    default: {
      launch: vi.fn().mockResolvedValue(browser),
    },
    __page: page,
    __browser: browser,
  }
})

/** The mocked page/browser the vi.mock factory built (vi.hoisted-safe shape). */
const getMocks = async (): Promise<{
  page: {
    setDefaultTimeout: ReturnType<typeof vi.fn>
    setViewport: ReturnType<typeof vi.fn>
    goto: ReturnType<typeof vi.fn>
    setContent: ReturnType<typeof vi.fn>
    evaluate: ReturnType<typeof vi.fn>
    screenshot: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
  }
}> => {
  const mod = (await import('puppeteer')) as unknown as {
    __page: Awaited<ReturnType<typeof getMocks>>['page']
  }
  return { page: mod.__page }
}

import { createProvider, imageDimensions, SCREENSHOT_LIMITS } from '../provider.js'

let provider: ScreenshotProvider
let page: Awaited<ReturnType<typeof getMocks>>['page']

beforeEach(async () => {
  vi.clearAllMocks()
  ;({ page } = await getMocks())
  page.screenshot.mockResolvedValue(new Uint8Array(PNG_BYTES))
  page.evaluate.mockResolvedValue(2400)
  provider = createProvider()
})

describe('api-screenshots-puppeteer', () => {
  it('captures a URL at the requested viewport and returns the bytes', async () => {
    const bytes = await provider.capture(
      { url: 'https://example.com' },
      { width: 1280, height: 800 },
    )
    expect(page.setViewport).toHaveBeenCalledWith({
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
    })
    expect(page.goto).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ waitUntil: 'load' }),
    )
    expect(page.screenshot).toHaveBeenCalledTimes(1)
    expect(bytes).toEqual(PNG_BYTES)
    expect(page.close).toHaveBeenCalled()
  })

  it('captures HTML without navigating', async () => {
    await provider.capture({ html: '<h1>og</h1>' }, { width: 1200, height: 630 })
    expect(page.setContent).toHaveBeenCalledWith('<h1>og</h1>', expect.anything())
    expect(page.goto).not.toHaveBeenCalled()
  })

  it('clamps a hostile scrollHeight to the full-page cap and captures a clip', async () => {
    page.evaluate.mockResolvedValue(50_000_000)
    await provider.capture({ html: '<p>tall</p>' }, { fullPage: true, width: 1000 })
    const [shotOptions] = page.screenshot.mock.calls[0]
    expect((shotOptions as { clip: { height: number } }).clip.height).toBe(
      SCREENSHOT_LIMITS.maxFullPageHeight,
    )
  })

  it('waits delayMs after load', async () => {
    vi.useFakeTimers()
    const pending = provider.capture({ html: '<p>x</p>' }, { delayMs: 500 })
    await vi.advanceTimersByTimeAsync(500)
    await pending
    vi.useRealTimers()
    expect(page.screenshot).toHaveBeenCalledTimes(1)
  })

  it.each([
    [{}, undefined, 'exactly one'],
    [{ url: 'https://a.com', html: '<p>x</p>' }, undefined, 'exactly one'],
    [{ url: '' }, undefined, '"url"'],
    [{ url: 'ftp://example.com' }, undefined, 'http(s)'],
    [{ url: 'x'.repeat(SCREENSHOT_LIMITS.maxUrlChars + 1) }, undefined, '"url"'],
    [{ html: '' }, undefined, '"html"'],
    [{ html: 'x'.repeat(SCREENSHOT_LIMITS.maxHtmlChars + 1) }, undefined, 'characters'],
    [{ html: '<p>x</p>' }, { width: 8 }, '"options.width"'],
    [{ html: '<p>x</p>' }, { width: 4000 }, '"options.width"'],
    [{ html: '<p>x</p>' }, { height: 0 }, '"options.height"'],
    [{ html: '<p>x</p>' }, { scale: 5 }, '"options.scale"'],
    [{ html: '<p>x</p>' }, { format: 'webp' }, '"options.format"'],
    [{ html: '<p>x</p>' }, { quality: 0 }, '"options.quality"'],
    [{ html: '<p>x</p>' }, { fullPage: 'yes' }, '"options.fullPage"'],
    [{ html: '<p>x</p>' }, { delayMs: 9000 }, '"options.delayMs"'],
    [{ html: '<p>x</p>' }, { width: 3840, height: 3840, scale: 3 }, 'pixel budget'],
  ] as const)(
    'refuses bad input before Chrome is asked for anything: %j %j',
    async (source, options, messagePart) => {
      await expect(provider.capture(source as never, options as never)).rejects.toThrow(messagePart)
      expect(page.screenshot).not.toHaveBeenCalled()
    },
  )

  it('refuses an over-budget full-page capture after the page reports its height', async () => {
    page.evaluate.mockResolvedValue(SCREENSHOT_LIMITS.maxFullPageHeight)
    await expect(
      provider.capture({ html: '<p>x</p>' }, { fullPage: true, width: 3840, scale: 3 }),
    ).rejects.toThrow('pixel budget')
    expect(page.screenshot).not.toHaveBeenCalled()
  })

  it('reports image dimensions from PNG and JPEG bytes', () => {
    expect(imageDimensions(PNG_BYTES)).toEqual({ width: 1, height: 1 })
    // A minimal JPEG: SOI + a SOF0 segment carrying 2×3 dimensions.
    const jpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x03, 0x00, 0x02, 0x01, 0x01, 0x00,
    ])
    expect(imageDimensions(jpeg)).toEqual({ width: 2, height: 3 })
    expect(imageDimensions(Buffer.from('not an image'))).toBeUndefined()
  })
})

/**
 * Puppeteer implementation of ScreenshotProvider.
 *
 * Uses headless Chrome via Puppeteer to capture PNG/JPEG images of a URL or
 * an HTML string, in this process.
 *
 * @remarks
 * **The page is untrusted input and this process has NO egress guard.** A
 * `url:` capture navigates to that address from YOUR machine's network, and
 * an `html:` capture fetches whatever the markup names — a user-supplied URL
 * or unescaped value can reach `169.254.169.254`, `localhost`, or your
 * private network from inside your server. Only capture URLs you control, or
 * route Chrome through your own proxy (`launchArgs:
 * ['--proxy-server=…']`). The hosted molecule.dev provider runs the same
 * capture behind an egress guard that dials public addresses only.
 *
 * @module
 */

import type {
  Browser,
  LaunchOptions,
  ScreenshotOptions as PuppeteerScreenshotOptions,
} from 'puppeteer'
import puppeteer from 'puppeteer'

import type {
  CaptureSource,
  ScreenshotOptions,
  ScreenshotProvider,
} from '@molecule/api-screenshots'

import type { PuppeteerScreenshotsConfig } from './types.js'

/** Per-capture limits, enforced before Chrome is asked for anything. */
export const SCREENSHOT_LIMITS = {
  minViewport: 16,
  maxViewport: 3840,
  maxScale: 3,
  maxQuality: 100,
  maxDelayMs: 5000,
  maxUrlChars: 2048,
  maxHtmlChars: 2_000_000,
  /** How tall a `fullPage` capture may get, in CSS pixels, whatever the page claims. */
  maxFullPageHeight: 20_000,
  /** Raster budget: width × height × scale² must stay under this many pixels. */
  maxPixels: 25_000_000,
} as const

/**
 * Validates one capture the way the hosted service does — before Chrome does
 * any work — and returns the sanitized fields.
 *
 * @param source - What to capture.
 * @param options - The caller's options.
 * @returns The sanitized capture plan.
 * @throws {Error} Naming the first field that is out of contract.
 */
function planCapture(
  source: CaptureSource,
  options?: ScreenshotOptions,
): {
  url?: string
  html?: string
  viewport: { width: number; height: number; deviceScaleFactor: number }
  fullPage: boolean
  format: 'png' | 'jpeg'
  quality: number
  delayMs: number
} {
  const hasUrl = typeof source.url === 'string'
  const hasHtml = typeof source.html === 'string'
  if (hasUrl === hasHtml) {
    throw new Error('Pass exactly one of "url" or "html".')
  }
  const url = hasUrl ? (source.url as string).trim() : undefined
  const html = hasHtml ? (source.html as string) : undefined
  if (url !== undefined) {
    if (url.length === 0 || url.length > SCREENSHOT_LIMITS.maxUrlChars) {
      throw new Error(`"url" must be 1-${SCREENSHOT_LIMITS.maxUrlChars} characters.`)
    }
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch (_error) {
      // Intentional: the parse failure becomes the field error below.
      throw new Error('"url" must be an absolute http(s) URL.', { cause: _error })
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('"url" must be an absolute http(s) URL.')
    }
  }
  if (html !== undefined) {
    if (html.length === 0) throw new Error('"html" must be non-empty text.')
    if (html.length > SCREENSHOT_LIMITS.maxHtmlChars) {
      throw new Error(`"html" is over ${SCREENSHOT_LIMITS.maxHtmlChars} characters.`)
    }
  }

  const o = options ?? {}
  const width = o.width ?? 1280
  const height = o.height ?? 800
  const scale = o.scale ?? 1
  if (
    !Number.isInteger(width) ||
    width < SCREENSHOT_LIMITS.minViewport ||
    width > SCREENSHOT_LIMITS.maxViewport
  ) {
    throw new Error(
      `"options.width" must be an integer from ${SCREENSHOT_LIMITS.minViewport} to ${SCREENSHOT_LIMITS.maxViewport}.`,
    )
  }
  if (
    !Number.isInteger(height) ||
    height < SCREENSHOT_LIMITS.minViewport ||
    height > SCREENSHOT_LIMITS.maxViewport
  ) {
    throw new Error(
      `"options.height" must be an integer from ${SCREENSHOT_LIMITS.minViewport} to ${SCREENSHOT_LIMITS.maxViewport}.`,
    )
  }
  if (
    typeof o.scale === 'number' &&
    (!Number.isFinite(o.scale) || o.scale < 1 || o.scale > SCREENSHOT_LIMITS.maxScale)
  ) {
    throw new Error(`"options.scale" must be a number from 1 to ${SCREENSHOT_LIMITS.maxScale}.`)
  }
  const format = o.format ?? 'png'
  if (format !== 'png' && format !== 'jpeg') {
    throw new Error('"options.format" must be "png" or "jpeg".')
  }
  const quality = o.quality ?? 80
  if (
    o.quality !== undefined &&
    (!Number.isInteger(quality) || quality < 1 || quality > SCREENSHOT_LIMITS.maxQuality)
  ) {
    throw new Error(
      `"options.quality" must be an integer from 1 to ${SCREENSHOT_LIMITS.maxQuality}.`,
    )
  }
  if (o.fullPage !== undefined && typeof o.fullPage !== 'boolean') {
    throw new Error('"options.fullPage" must be a boolean.')
  }
  const delayMs = o.delayMs ?? 0
  if (
    o.delayMs !== undefined &&
    (!Number.isInteger(delayMs) || delayMs < 0 || delayMs > SCREENSHOT_LIMITS.maxDelayMs)
  ) {
    throw new Error(
      `"options.delayMs" must be an integer from 0 to ${SCREENSHOT_LIMITS.maxDelayMs}.`,
    )
  }

  const fullPage = o.fullPage ?? false
  // A viewport capture's raster is known up front; a fullPage one is bounded
  // after the page reports its (untrusted) scroll height.
  if (!fullPage && width * height * scale * scale > SCREENSHOT_LIMITS.maxPixels) {
    throw new Error(
      `The capture is ${width}×${height} at scale ${scale} — over the ${SCREENSHOT_LIMITS.maxPixels}-pixel budget. Reduce the viewport or the scale.`,
    )
  }
  return {
    url,
    html,
    viewport: { width, height, deviceScaleFactor: scale },
    fullPage,
    format,
    quality,
    delayMs,
  }
}

/**
 * Reads the image dimensions out of encoded PNG bytes (the IHDR chunk) or
 * JPEG bytes (the first start-of-frame marker), so a caller can size the
 * result without a decoding dependency.
 *
 * @param bytes - The encoded image.
 * @returns Width and height in pixels, or undefined when the bytes are not a decodable PNG/JPEG.
 */
export function imageDimensions(bytes: Buffer): { width: number; height: number } | undefined {
  if (
    bytes.length >= 24 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1
        continue
      }
      const marker = bytes[offset + 1]
      const length = bytes.readUInt16BE(offset + 2)
      // SOF0/1 (baseline, extended) or SOF2 (progressive) carry the dimensions.
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7)) {
        return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) }
      }
      offset += 2 + length
    }
  }
  return undefined
}

/**
 * Creates a Puppeteer-backed screenshot provider.
 *
 * @param config - Optional provider configuration (executable path, launch args, timeout).
 * @returns A `ScreenshotProvider` backed by Puppeteer.
 */
export const createProvider = (config?: PuppeteerScreenshotsConfig): ScreenshotProvider => {
  const timeout = config?.timeout ?? 30_000

  let browserInstance: Browser | null = null

  const getLaunchOptions = (): LaunchOptions => {
    const options: LaunchOptions = {
      headless: config?.headless !== false,
      args: config?.launchArgs ?? ['--no-sandbox', '--disable-setuid-sandbox'],
    }
    if (config?.executablePath) {
      options.executablePath = config.executablePath
    }
    return options
  }

  const getBrowser = async (): Promise<Browser> => {
    if (config?.reuseBrowser !== false && browserInstance?.connected) {
      return browserInstance
    }
    const browser = await puppeteer.launch(getLaunchOptions())
    if (config?.reuseBrowser !== false) {
      browserInstance = browser
    }
    return browser
  }

  const capture = async (source: CaptureSource, options?: ScreenshotOptions): Promise<Buffer> => {
    const plan = planCapture(source, options)
    const browser = await getBrowser()
    const page = await browser.newPage()
    try {
      page.setDefaultTimeout(timeout)
      await page.setViewport(plan.viewport)
      if (plan.url !== undefined) {
        await page.goto(plan.url, { waitUntil: 'load', timeout })
      } else {
        await page.setContent(plan.html as string, { waitUntil: 'load', timeout })
      }
      if (plan.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, plan.delayMs))
      }
      const shot: PuppeteerScreenshotOptions =
        plan.format === 'jpeg' ? { type: 'jpeg', quality: plan.quality } : { type: 'png' }
      if (plan.fullPage) {
        // The page's own scrollHeight is untrusted input: clamp it before it
        // becomes a clip, so a page claiming a million-pixel height cannot
        // size this capture.
        const claimed = (await page.evaluate(
          () => document.documentElement.scrollHeight,
        )) as unknown
        const scrollHeight =
          typeof claimed === 'number' && Number.isFinite(claimed)
            ? Math.max(1, Math.floor(claimed))
            : plan.viewport.height
        const captureHeight = Math.min(scrollHeight, SCREENSHOT_LIMITS.maxFullPageHeight)
        if (
          plan.viewport.width * captureHeight * plan.viewport.deviceScaleFactor ** 2 >
          SCREENSHOT_LIMITS.maxPixels
        ) {
          throw new Error(
            `The page is ${scrollHeight}px tall — a full-page capture at width ${plan.viewport.width} and scale ${plan.viewport.deviceScaleFactor} is over the ${SCREENSHOT_LIMITS.maxPixels}-pixel budget. Reduce the width or the scale.`,
          )
        }
        // A clip (not fullPage: true) is what keeps a page claiming an
        // enormous scrollHeight inside the budget: the capture is the clamped
        // rectangle, whatever the page says it is.
        Object.assign(shot, {
          clip: { x: 0, y: 0, width: plan.viewport.width, height: captureHeight },
        })
      }
      return Buffer.from(await page.screenshot(shot))
    } finally {
      await page.close()
      if (config?.reuseBrowser === false) {
        await browser.close()
      }
    }
  }

  return { capture }
}

/**
 * Default Puppeteer screenshot provider instance, lazily initialized on first access.
 */
let _provider: ScreenshotProvider | null = null

/**
 * The provider implementation, lazily initialized with default config.
 */
export const provider: ScreenshotProvider = new Proxy({} as ScreenshotProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})

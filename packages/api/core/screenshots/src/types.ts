/**
 * Type definitions for the screenshot capture core interface.
 *
 * @module
 */

/** Output image format. */
export type ScreenshotFormat = 'png' | 'jpeg'

/**
 * What to capture — a URL to navigate to, or an HTML string to render.
 * Exactly one of the two must be given.
 */
export interface CaptureSource {
  /**
   * The page to visit, `http:` or `https:`. A browser-engine provider fetches
   * what this page names with YOUR server's network access (SSRF) — never
   * point it at an address you would not open yourself, and prefer
   * HTML-escaping any user-supplied URL before building the capture call.
   */
  url?: string

  /** The HTML to render — a full document or a fragment. */
  html?: string
}

/**
 * Options for one capture.
 */
export interface ScreenshotOptions {
  /** Viewport width in CSS pixels. Bounded by each provider (16–3840). Defaults to `1280`. */
  width?: number

  /** Viewport height in CSS pixels. Bounded by each provider (16–3840). Defaults to `800`. */
  height?: number

  /**
   * Capture the whole scrollable page instead of the viewport. Providers cap
   * how tall a capture may get — a hostile page's `scrollHeight` is untrusted
   * input. Defaults to `false`.
   */
  fullPage?: boolean

  /** Output image format. Defaults to `'png'`. */
  format?: ScreenshotFormat

  /** JPEG quality, 1–100. Ignored for `png`. Defaults to `80`. */
  quality?: number

  /** Device scale factor (1–3) — `2` renders the page at twice the pixel density. Defaults to `1`. */
  scale?: number

  /**
   * Milliseconds to wait after the page loads before capturing (0–5000), so
   * scripts and web fonts can finish. Defaults to `0`.
   */
  delayMs?: number
}

/**
 * Screenshot capture provider interface.
 *
 * All screenshot providers must implement this interface.
 * Bond packages (Puppeteer, molecule.dev hosted, …) provide concrete
 * implementations.
 */
export interface ScreenshotProvider {
  /**
   * Captures one image of a URL or an HTML string.
   *
   * @param source - What to capture (URL or HTML — exactly one).
   * @param options - Capture options (viewport, format, scale, …).
   * @returns The image bytes (`image/png` or `image/jpeg`).
   */
  capture(source: CaptureSource, options?: ScreenshotOptions): Promise<Buffer>
}

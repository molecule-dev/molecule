/**
 * Configuration for the Puppeteer screenshot provider.
 *
 * @module
 */

/** Options for `createProvider()`. Every field falls back to its default. */
export interface PuppeteerScreenshotsConfig {
  /** Path to a Chrome/Chromium executable. Defaults to Puppeteer's own download. */
  executablePath?: string

  /** Extra Chrome launch arguments. Defaults to `['--no-sandbox', '--disable-setuid-sandbox']`. */
  launchArgs?: string[]

  /** Run Chrome headless. Defaults to `true`. */
  headless?: boolean

  /** Per-navigation / per-screenshot timeout in milliseconds. Defaults to `30_000`. */
  timeout?: number

  /**
   * Keep one browser instance across captures instead of launching Chrome per
   * capture. Defaults to `true`.
   */
  reuseBrowser?: boolean
}

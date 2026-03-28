/**
 * Puppeteer PDF provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the Puppeteer PDF provider.
 */
export interface PuppeteerPDFConfig {
  /**
   * Custom Puppeteer launch arguments passed to `puppeteer.launch()`.
   * Useful for running in Docker or CI environments.
   *
   * @example `['--no-sandbox', '--disable-setuid-sandbox']`
   */
  launchArgs?: string[]

  /**
   * Path to a custom Chromium/Chrome executable.
   * If omitted, Puppeteer uses its bundled browser.
   */
  executablePath?: string

  /**
   * Whether to run in headless mode. Defaults to `true`.
   */
  headless?: boolean

  /**
   * Timeout in milliseconds for page navigation and PDF generation.
   * Defaults to `30000` (30 seconds).
   */
  timeout?: number

  /**
   * Whether to reuse a single browser instance across calls.
   * Improves performance for batch operations. Defaults to `true`.
   */
  reuseBrowser?: boolean

  /**
   * Opening delimiter for simple template interpolation in `fromTemplate`.
   * Defaults to `'{{'`.
   */
  templateOpenDelimiter?: string

  /**
   * Closing delimiter for simple template interpolation in `fromTemplate`.
   * Defaults to `'}}'`.
   */
  templateCloseDelimiter?: string
}

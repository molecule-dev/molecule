/**
 * E2E bond contract: a provider opens a Playwright-shaped `Page`.
 *
 * The page type IS Playwright's `Page` interface, so every existing spec,
 * helper and editor completion keeps working. A browser bond returns a real
 * Page; a bond built on {@link E2ETransport} (the live-preview bond) returns
 * the documented subset with every other method throwing a one-line error
 * that names the alternative.
 *
 * @module
 */

import type { Page } from '@playwright/test'

/** Which bond the runner should use: the live preview (a molecule sandbox) or real browsers. */
export type E2EProviderName = 'preview' | 'playwright' | (string & {})

/** A viewport size in CSS pixels. */
export interface E2EViewport {
  width: number
  height: number
}

/** Options a test runner or script passes when opening a page. */
export interface E2EConnectOptions {
  /**
   * Base URL for relative `page.goto()` paths (Playwright's `use.baseURL`).
   * The preview bond resolves paths against the previewed page's own origin
   * instead, so a `http://localhost:<port>` base is simply ignored there.
   */
  baseURL?: string
  /** Initial viewport (Playwright's `use.viewport`); `null` = leave as is. */
  viewport?: E2EViewport | null
  /** Default timeout for actions, waits and expect polling, in ms. */
  timeout?: number
  /** Timeout for navigations, in ms. */
  navigationTimeout?: number
}

/** A bond: opens pages. */
export interface E2EProvider {
  /** Bond name, e.g. `preview` or `playwright`. */
  readonly name: string
  /**
   * Open a page. Close it with `page.close()`; for a browser bond that also
   * closes the context and browser it opened for this page.
   */
  connect(options?: E2EConnectOptions): Promise<Page>
}

/** A console message forwarded from the page. */
export interface E2EConsolePayload {
  type: string
  text: string
  url?: string
  lineNumber?: number
  columnNumber?: number
}

/** An uncaught error forwarded from the page. */
export interface E2EErrorPayload {
  message: string
  stack?: string
}

/**
 * The minimal channel a bond supplies to {@link createEvaluatePage}: run a
 * function inside the page, navigate, resize, and forward console/error
 * events. Everything Playwright-shaped is built on top of `evaluate`.
 */
export interface E2ETransport {
  /**
   * Run `(source)(arg)` inside the page — `source` is a function expression's
   * text (sync or async) — and return its JSON-serialisable result.
   */
  evaluate(source: string, arg?: unknown, options?: { timeout?: number }): Promise<unknown>
  /** Navigate; resolves once the NEW document is connected and ready. */
  navigate(
    kind: 'goto' | 'reload' | 'back' | 'forward',
    url?: string,
    options?: { timeout?: number },
  ): Promise<void>
  /** Resize the page; resolves with the size the page actually got. */
  viewport(width: number, height: number): Promise<E2EViewport>
  /** The page's last known URL. */
  url(): string
  /** Subscribe to forwarded events; returns an unsubscribe function. */
  on(
    event: 'console' | 'pageerror' | 'close',
    listener: (payload: E2EConsolePayload | E2EErrorPayload | undefined) => void,
  ): () => void
  /** Release the page (and the transport's connection). */
  close(): Promise<void>
}

/** Options for {@link createEvaluatePage}. */
export interface E2EPageOptions extends E2EConnectOptions {
  /** Bond name used in error messages (`… is not supported by the preview bond`). */
  bondName?: string
}

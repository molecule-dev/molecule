/**
 * A Playwright-shaped `Page` built on an {@link E2ETransport} — the driver
 * half of the runtime in `runtime.ts`. Bonds that can only run code inside a
 * page (the live preview) get the whole documented subset from this file.
 *
 * @module
 */

import type { APIResponse, BrowserContext, Frame, Locator, Page } from '@playwright/test'

import type {
  E2EConsolePayload,
  E2EErrorPayload,
  E2EPageOptions,
  E2ETransport,
  E2EViewport,
} from '@molecule/app-e2e'
import { E2EStrictModeError, E2ETimeoutError, E2EUnsupportedError } from '@molecule/app-e2e'

import { installE2ERuntime, type LocatorStep, type TextMatch } from './runtime.js'

/** Brand on locators created here (the `expect` wrapper routes on it). */
export const E2E_LOCATOR: unique symbol = Symbol.for('molecule.e2e.locator')
/** Brand on pages created here. */
export const E2E_PAGE: unique symbol = Symbol.for('molecule.e2e.page')

const RUNTIME_SOURCE = String(installE2ERuntime)
const CALL_SOURCE =
  '(r) => { const g = globalThis; if (!g.__molE2E) return { __needInstall: true }; return g.__molE2E.call(r) }'

type Dict = Record<string, unknown>
type Listener = (payload: unknown) => void

const toMatch = (
  value: string | RegExp,
  opts?: { exact?: boolean; ignoreCase?: boolean },
): TextMatch =>
  value instanceof RegExp
    ? { re: { source: value.source, flags: value.flags } }
    : { s: value, exact: opts?.exact, ignoreCase: opts?.ignoreCase }

/** Full-text match (expect's toHaveText): a string must equal the whole text; a RegExp tests it. */
const toFull = (value: string | RegExp, opts?: { ignoreCase?: boolean }): TextMatch =>
  value instanceof RegExp
    ? { re: { source: value.source, flags: value.flags } }
    : { s: value, exact: true, ignoreCase: opts?.ignoreCase }

const fnSource = (fn: unknown): string => {
  if (typeof fn === 'function') return fn.toString()
  const s = String(fn)
  return /^\s*(async\s+)?(function\b|\([^)]*\)\s*=>|[\w$]+\s*=>)/.test(s) ? s : `() => (${s})`
}

const describeSteps = (steps: LocatorStep[]): string =>
  steps
    .map((s) => {
      const t = (m: TextMatch | undefined): string =>
        m ? (m.re ? `/${m.re.source}/${m.re.flags}` : JSON.stringify(m.s)) : ''
      switch (s.k) {
        case 'css':
        case 'raw':
          return `locator(${JSON.stringify(s.sel)})`
        case 'text':
          return `getByText(${t(s.m)})`
        case 'xpath':
          return `locator(${JSON.stringify('xpath=' + s.expr)})`
        case 'role':
          return `getByRole(${JSON.stringify(s.role)}${s.name !== undefined ? `, { name: ${t(s.name)} }` : ''})`
        case 'label':
          return `getByLabel(${t(s.m)})`
        case 'placeholder':
          return `getByPlaceholder(${t(s.m)})`
        case 'testid':
          return `getByTestId(${t(s.m)})`
        case 'title':
          return `getByTitle(${t(s.m)})`
        case 'alt':
          return `getByAltText(${t(s.m)})`
        case 'nth':
          return s.i === 0 ? 'first()' : s.i === -1 ? 'last()' : `nth(${s.i})`
        case 'visible':
          return 'filter({ visible: true })'
        case 'filter':
          return `filter(${JSON.stringify({ hasText: s.hasText?.s ?? s.hasText?.re?.source, hasNotText: s.hasNotText?.s })})`
        default:
          return (s as { k: string }).k
      }
    })
    .join('.')

const UNSUPPORTED_LOCATOR: Record<string, string> = {
  screenshot:
    'Screenshots need pixels; assert layout with boundingBox() and evaluate(el => getComputedStyle(el)...) instead, or run the spec with the playwright bond on your machine.',
  elementHandle:
    'Element handles are not available; keep using the Locator (click, evaluate, boundingBox, textContent all work).',
  elementHandles:
    'Element handles are not available; use locator.all(), locator.evaluateAll() or locator.count().',
  setInputFiles:
    "File inputs cannot be filled through the preview; set the input's files in page.evaluate() with a DataTransfer, or use the playwright bond.",
  dragTo:
    'Drag and drop is not synthesised; dispatch the dragstart/dragover/drop events with locator.dispatchEvent() or use the playwright bond.',
  frameLocator: 'Iframes inside the preview are not driven; only the top document is.',
  contentFrame: 'Iframes inside the preview are not driven; only the top document is.',
  selectText:
    'Select text with locator.evaluate(el => { const r = document.createRange(); r.selectNodeContents(el); getSelection().addRange(r) }).',
  and: 'Combine conditions with locator.filter({ has, hasText }) instead of and().',
  or: 'Use two locators, or a CSS selector list ("a, b"), instead of or().',
  ariaSnapshot: 'Use getByRole()/toHaveRole()/toHaveAccessibleName() instead of aria snapshots.',
}

const UNSUPPORTED_PAGE: Record<string, string> = {
  screenshot:
    'Screenshots need pixels; assert layout with locator.boundingBox() and page.evaluate(() => getComputedStyle(...)) instead, or run the spec with the playwright bond on your machine.',
  pdf: 'PDF rendering needs a real browser; use the playwright bond.',
  route:
    'Network interception needs a real browser. Read responses with page.request.get(url) or page.evaluate(() => fetch(url)) instead.',
  unroute: 'Network interception needs a real browser.',
  unrouteAll: 'Network interception needs a real browser.',
  routeFromHAR: 'Network interception needs a real browser.',
  waitForRequest:
    'Requests are not observable through the preview; call page.request.get(url) or page.evaluate(() => fetch(url)) and assert on the response.',
  waitForResponse:
    'Responses are not observable through the preview; call page.request.get(url) or page.evaluate(() => fetch(url)) and assert on the response.',
  waitForEvent:
    'Only console, pageerror, dialog and close events exist here; use page.on(...) for those, or poll with page.waitForFunction().',
  setContent:
    'The preview shows the running app; navigate with page.goto() instead of replacing the document.',
  emulateMedia:
    'Media emulation needs a real browser; test the phone layout with page.setViewportSize({ width: 390, height: 844 }), and read matchMedia() results with page.evaluate().',
  exposeFunction:
    'Bindings need a real browser; pass data with page.evaluate(fn, arg) and return values from it.',
  exposeBinding:
    'Bindings need a real browser; pass data with page.evaluate(fn, arg) and return values from it.',
  addInitScript:
    'Init scripts need a real browser; run setup with page.evaluate() after page.goto().',
  setExtraHTTPHeaders:
    'Request headers cannot be set for the previewed page; pass headers to page.request.get(url, { headers }).',
  $: 'Element handles are not available; use page.locator(selector) (it has click, textContent, evaluate, boundingBox...).',
  $$: 'Element handles are not available; use page.locator(selector).all() or locator.evaluateAll().',
  frame: 'Iframes inside the preview are not driven; only the top document is.',
  frameLocator: 'Iframes inside the preview are not driven; only the top document is.',
  accessibility: 'Use getByRole(), toHaveRole() and toHaveAccessibleName() instead.',
  coverage: 'Coverage needs a real browser.',
  clock:
    'Clock control needs a real browser; stub Date/setTimeout inside page.evaluate() if a test needs it.',
  requestGC: 'Not available through the preview.',
  setChecked: 'Use page.locator(selector).setChecked(value).',
}

const CONTEXT_UNSUPPORTED: Record<string, string> = {
  newPage: 'One page per test with the preview bond; reuse `page`.',
  cookies: 'Read cookies with page.evaluate(() => document.cookie).',
  addCookies: 'Set cookies with page.evaluate(() => { document.cookie = "..." }).',
  clearCookies:
    "Clear cookies with page.evaluate() (expire each one) or from the app's own sign-out.",
  storageState: 'Read storage with page.evaluate(() => ({ ...localStorage })).',
  route: 'Network interception needs a real browser.',
  unroute: 'Network interception needs a real browser.',
  addInitScript:
    'Init scripts need a real browser; run setup with page.evaluate() after page.goto().',
  exposeFunction: 'Bindings need a real browser.',
  exposeBinding: 'Bindings need a real browser.',
  setExtraHTTPHeaders: 'Request headers cannot be set for the previewed page.',
  setGeolocation: 'Geolocation emulation needs a real browser.',
  setOffline: 'Offline emulation needs a real browser.',
  waitForEvent: 'Only page-level console/pageerror/dialog/close events exist here.',
}

const defaultAlternative =
  'It needs a real browser; the same spec runs unchanged with @molecule/app-e2e-playwright on your machine or in CI. Inside the preview, page.evaluate() can usually do the same job.'

/** The response object `page.request.*` returns over the preview: a `fetch` run inside the page, read back as text. */
class ResponseImpl {
  constructor(
    private readonly r: {
      url: string
      status: number
      statusText: string
      ok: boolean
      headers: [string, string][]
      text: string
    },
  ) {}
  /** Whether the status is 2xx. */
  ok(): boolean {
    return this.r.ok
  }
  /** HTTP status code. */
  status(): number {
    return this.r.status
  }
  /** HTTP status text. */
  statusText(): string {
    return this.r.statusText
  }
  /** Playwright's `url()`: the last known URL (or, on a response, its final URL). */
  url(): string {
    return this.r.url
  }
  /** Response headers, lower-cased. */
  headers(): Record<string, string> {
    return Object.fromEntries(this.r.headers.map(([k, v]) => [k.toLowerCase(), v]))
  }
  /** Response headers as `{ name, value }` pairs. */
  headersArray(): { name: string; value: string }[] {
    return this.r.headers.map(([name, value]) => ({ name, value }))
  }
  /** The body as text (for a response) or the message text (for a console message). */
  async text(): Promise<string> {
    return this.r.text
  }
  /** The body parsed as JSON. */
  async json(): Promise<unknown> {
    return JSON.parse(this.r.text)
  }
  /** The body as a Buffer (UTF-8 text; binary bodies are not preserved). */
  async body(): Promise<Buffer> {
    return Buffer.from(this.r.text, 'utf8')
  }
  /** Nothing to release; kept for parity with Playwright. */
  async dispose(): Promise<void> {
    /* nothing to release */
  }
}

/** A Playwright-shaped Locator: a lazy chain of steps resolved inside the page on every action. */
class LocatorImpl {
  readonly [E2E_LOCATOR] = true
  constructor(
    private readonly owner: PageImpl,
    readonly steps: LocatorStep[],
  ) {}

  /** A new locator with more steps (locators are immutable). */
  private extend(step: LocatorStep | LocatorStep[]): LocatorImpl {
    return new LocatorImpl(this.owner, this.steps.concat(step))
  }
  /** Steps for a selector string (parsed in the page) or another locator. */
  private stepsOf(sel: string | LocatorImpl): LocatorStep[] {
    // A string is a Playwright selector (CSS, `text=`, `xpath=`, `>>`...); the page parses it.
    return typeof sel === 'string' ? [{ k: 'raw', sel }] : sel.steps
  }
  /** The filter steps a `filter()` / `locator()` options object adds. */
  private filterStep(opts?: {
    hasText?: string | RegExp
    hasNotText?: string | RegExp
    has?: LocatorImpl
    hasNot?: LocatorImpl
    visible?: boolean
  }): LocatorStep[] {
    const out: LocatorStep[] = []
    if (
      opts &&
      (opts.hasText !== undefined || opts.hasNotText !== undefined || opts.has || opts.hasNot)
    ) {
      out.push({
        k: 'filter',
        hasText: opts.hasText !== undefined ? toMatch(opts.hasText) : undefined,
        hasNotText: opts.hasNotText !== undefined ? toMatch(opts.hasNotText) : undefined,
        has: opts.has ? opts.has.steps : undefined,
        hasNot: opts.hasNot ? opts.hasNot.steps : undefined,
      })
    }
    if (opts?.visible) out.push({ k: 'visible' })
    return out
  }

  // ---- building ----
  /** Playwright's `locator()`: narrow to descendants matching a selector, with optional `hasText` / `has` filters. */
  locator(
    sel: string | LocatorImpl,
    opts?: {
      hasText?: string | RegExp
      hasNotText?: string | RegExp
      has?: LocatorImpl
      hasNot?: LocatorImpl
    },
  ): LocatorImpl {
    return this.extend(this.stepsOf(sel).concat(this.filterStep(opts)))
  }
  /** Playwright's `getByRole()`: by ARIA role, with accessible-name, heading-level and state options. */
  getByRole(role: string, opts: Dict = {}): LocatorImpl {
    return this.extend({
      k: 'role',
      role,
      name:
        opts.name !== undefined
          ? toMatch(opts.name as string | RegExp, { exact: opts.exact as boolean | undefined })
          : undefined,
      level: opts.level as number | undefined,
      checked: opts.checked as boolean | undefined,
      pressed: opts.pressed as boolean | undefined,
      expanded: opts.expanded as boolean | undefined,
      selected: opts.selected as boolean | undefined,
      disabled: opts.disabled as boolean | undefined,
      includeHidden: opts.includeHidden as boolean | undefined,
    })
  }
  /** Playwright's `getByText()`: the smallest elements whose text matches. */
  getByText(text: string | RegExp, opts?: { exact?: boolean }): LocatorImpl {
    return this.extend({ k: 'text', m: toMatch(text, { exact: opts?.exact }) })
  }
  /** Playwright's `getByLabel()`: form controls by their label text (also `aria-label`). */
  getByLabel(text: string | RegExp, opts?: { exact?: boolean }): LocatorImpl {
    return this.extend({ k: 'label', m: toMatch(text, { exact: opts?.exact }) })
  }
  /** Playwright's `getByPlaceholder()`. */
  getByPlaceholder(text: string | RegExp, opts?: { exact?: boolean }): LocatorImpl {
    return this.extend({ k: 'placeholder', m: toMatch(text, { exact: opts?.exact }) })
  }
  /** Playwright's `getByTitle()`. */
  getByTitle(text: string | RegExp, opts?: { exact?: boolean }): LocatorImpl {
    return this.extend({ k: 'title', m: toMatch(text, { exact: opts?.exact }) })
  }
  /** Playwright's `getByAltText()`. */
  getByAltText(text: string | RegExp, opts?: { exact?: boolean }): LocatorImpl {
    return this.extend({ k: 'alt', m: toMatch(text, { exact: opts?.exact }) })
  }
  /** Playwright's `getByTestId()` on the configured test-id attribute (default `data-testid`). */
  getByTestId(id: string | RegExp): LocatorImpl {
    return this.extend({ k: 'testid', attr: this.owner.testIdAttribute, m: toFull(id) })
  }
  /** Playwright's `locator.filter()`: keep matches by text, by a descendant locator, or by visibility. */
  filter(
    opts: {
      hasText?: string | RegExp
      hasNotText?: string | RegExp
      has?: LocatorImpl
      hasNot?: LocatorImpl
      visible?: boolean
    } = {},
  ): LocatorImpl {
    return this.extend(this.filterStep(opts))
  }
  /** The first match. */
  first(): LocatorImpl {
    return this.extend({ k: 'nth', i: 0 })
  }
  /** The last match. */
  last(): LocatorImpl {
    return this.extend({ k: 'nth', i: -1 })
  }
  /** The i-th match (a negative index counts from the end). */
  nth(i: number): LocatorImpl {
    return this.extend({ k: 'nth', i })
  }
  /** The page this belongs to (null for a console message over the preview). */
  page(): Page {
    return this.owner.asPage()
  }
  /** The locator chain, Playwright-style, for error messages. */
  toString(): string {
    return describeSteps(this.steps)
  }
  /** The locator chain as text. */
  describe(): string {
    return describeSteps(this.steps)
  }

  // ---- runtime calls ----
  /** Run one runtime call for this locator. */
  private async call(fn: string, args: unknown[], timeout?: number): Promise<Dict> {
    return this.owner.rt(fn, args, timeout)
  }
  /** Turn a runtime reply into a value, throwing strict-mode, timeout or plain errors. */
  private unwrap(res: Dict, what: string): unknown {
    if (res.strict) throw new E2EStrictModeError(this.describe(), Number(res.count))
    if (res.ok === false) {
      const message = `${what}: ${String(res.error ?? 'failed')}`
      throw res.timeout
        ? new E2ETimeoutError(`${message} (timeout ${this.owner.defaultTimeout}ms)`)
        : new Error(message)
    }
    return res.value
  }
  /** Run a single-target action with auto-wait and actionability checks. */
  private async act(action: string, opts: Dict = {}): Promise<void> {
    const timeout = (opts.timeout as number | undefined) ?? this.owner.defaultTimeout
    const res = await this.call(
      'act',
      [this.steps, action, { ...opts, timeout: undefined }],
      timeout,
    )
    this.unwrap(res, `locator.${action}()`)
  }
  /** Read one value from the single strict target. */
  private async read(what: string, args: unknown[] = [], timeout?: number): Promise<unknown> {
    return this.unwrap(
      await this.call('read', [this.steps, what, args], timeout ?? this.owner.defaultTimeout),
      `locator.${what}()`,
    )
  }

  // ---- actions ----
  /** Playwright's `click()`: waits until the element is visible, enabled and not covered, then clicks its centre (or `position`). */
  click(opts?: Dict): Promise<void> {
    return this.act('click', opts)
  }
  /** Playwright's `dblclick()`. */
  dblclick(opts?: Dict): Promise<void> {
    return this.act('dblclick', opts)
  }
  /** Playwright's `hover()`: moves the pointer over the element. */
  hover(opts?: Dict): Promise<void> {
    return this.act('hover', opts)
  }
  /** Playwright's `tap()`: touch events followed by a click. */
  tap(opts?: Dict): Promise<void> {
    return this.act('tap', opts)
  }
  /** Playwright's `fill()`: focuses, replaces the value through the native setter and fires `input` / `change`. */
  fill(value: string, opts?: Dict): Promise<void> {
    return this.act('fill', { ...opts, value })
  }
  /** Playwright's `clear()`: fills with an empty string. */
  clear(opts?: Dict): Promise<void> {
    return this.act('clear', opts)
  }
  /** Playwright's `type()`: presses each character in turn (or, on a console message, its level). */
  type(text: string, opts?: Dict): Promise<void> {
    return this.act('type', { ...opts, text })
  }
  /** Playwright's `pressSequentially()`: presses each character in turn. */
  pressSequentially(text: string, opts?: Dict): Promise<void> {
    return this.act('type', { ...opts, text })
  }
  /** Playwright's `press()`: a key or chord (`Enter`, `Control+a`); Enter submits a form. */
  press(key: string, opts?: Dict): Promise<void> {
    return this.act('press', { ...opts, key })
  }
  /** Playwright's `check()`: clicks until checked (or, on the page, throws on a failed runtime reply). */
  check(opts?: Dict): Promise<void> {
    return this.act('check', opts)
  }
  /** Playwright's `uncheck()`: clicks until unchecked. */
  uncheck(opts?: Dict): Promise<void> {
    return this.act('uncheck', opts)
  }
  /** Playwright's `setChecked()`. */
  setChecked(checked: boolean, opts?: Dict): Promise<void> {
    return this.act('setChecked', { ...opts, checked })
  }
  /** Playwright's `selectOption()`: by value, label or index; returns the selected values. */
  async selectOption(values: unknown, opts?: Dict): Promise<string[]> {
    const timeout = (opts?.timeout as number | undefined) ?? this.owner.defaultTimeout
    const res = await this.call('act', [this.steps, 'selectOption', { values }], timeout)
    this.unwrap(res, 'locator.selectOption()')
    return (res.values as string[]) ?? []
  }
  /** Playwright's `focus()`. */
  focus(opts?: Dict): Promise<void> {
    return this.act('focus', opts)
  }
  /** Playwright's `blur()`. */
  blur(opts?: Dict): Promise<void> {
    return this.act('blur', opts)
  }
  /** Playwright's `dispatchEvent()`: a synthetic event of the given type. */
  dispatchEvent(type: string, init?: Dict, opts?: Dict): Promise<void> {
    return this.act('dispatchEvent', { ...opts, type, init })
  }
  /** Playwright's `scrollIntoViewIfNeeded()`. */
  scrollIntoViewIfNeeded(opts?: Dict): Promise<void> {
    return this.act('scrollIntoViewIfNeeded', opts)
  }
  /** No-op over the preview: nothing to paint. */
  async highlight(): Promise<void> {
    /* nothing to paint through the preview */
  }

  // ---- reads ----
  /** Playwright's `count()`: how many elements match right now. */
  async count(): Promise<number> {
    return (await this.call('readAll', [this.steps, 'count'])).value as number
  }
  /** Playwright's `all()`: one locator per current match. */
  async all(): Promise<LocatorImpl[]> {
    const n = await this.count()
    return Array.from({ length: n }, (_, i) => this.nth(i))
  }
  /** Playwright's `allTextContents()`. */
  async allTextContents(): Promise<string[]> {
    return (await this.call('readAll', [this.steps, 'allTextContents'])).value as string[]
  }
  /** Playwright's `allInnerTexts()`. */
  async allInnerTexts(): Promise<string[]> {
    return (await this.call('readAll', [this.steps, 'allInnerTexts'])).value as string[]
  }
  /** Playwright's `textContent()` (strict: exactly one match). */
  textContent(opts?: Dict): Promise<string | null> {
    return this.read('textContent', [], opts?.timeout as number | undefined) as Promise<
      string | null
    >
  }
  /** Playwright's `innerText()`. */
  innerText(opts?: Dict): Promise<string> {
    return this.read('innerText', [], opts?.timeout as number | undefined) as Promise<string>
  }
  /** Playwright's `innerHTML()`. */
  innerHTML(opts?: Dict): Promise<string> {
    return this.read('innerHTML', [], opts?.timeout as number | undefined) as Promise<string>
  }
  /** Playwright's `inputValue()` for inputs, textareas and selects. */
  inputValue(opts?: Dict): Promise<string> {
    return this.read('inputValue', [], opts?.timeout as number | undefined) as Promise<string>
  }
  /** Playwright's `getAttribute()`. */
  getAttribute(name: string, opts?: Dict): Promise<string | null> {
    return this.read('getAttribute', [name], opts?.timeout as number | undefined) as Promise<
      string | null
    >
  }
  /** Playwright's `isVisible()`: false when nothing matches; no waiting. */
  isVisible(): Promise<boolean> {
    return this.read('isVisible') as Promise<boolean>
  }
  /** Playwright's `isHidden()`: true when nothing matches; no waiting. */
  isHidden(): Promise<boolean> {
    return this.read('isHidden') as Promise<boolean>
  }
  /** Playwright's `isEnabled()`. */
  isEnabled(opts?: Dict): Promise<boolean> {
    return this.read('isEnabled', [], opts?.timeout as number | undefined) as Promise<boolean>
  }
  /** Playwright's `isDisabled()`. */
  isDisabled(opts?: Dict): Promise<boolean> {
    return this.read('isDisabled', [], opts?.timeout as number | undefined) as Promise<boolean>
  }
  /** Playwright's `isEditable()`. */
  isEditable(opts?: Dict): Promise<boolean> {
    return this.read('isEditable', [], opts?.timeout as number | undefined) as Promise<boolean>
  }
  /** Playwright's `isChecked()` for checkboxes, radios and switches. */
  isChecked(opts?: Dict): Promise<boolean> {
    return this.read('isChecked', [], opts?.timeout as number | undefined) as Promise<boolean>
  }
  /** Playwright's `boundingBox()`: the element's rect, or null when it is not visible. */
  boundingBox(
    opts?: Dict,
  ): Promise<{ x: number; y: number; width: number; height: number } | null> {
    return this.read('boundingBox', [], opts?.timeout as number | undefined) as Promise<{
      x: number
      y: number
      width: number
      height: number
    } | null>
  }
  /** Playwright's `evaluate()`: runs the function inside the page and returns JSON. */
  async evaluate(fn: unknown, arg?: unknown, opts?: Dict): Promise<unknown> {
    return this.unwrap(
      await this.call(
        'evalOn',
        [this.steps, fnSource(fn), arg],
        (opts?.timeout as number | undefined) ?? this.owner.defaultTimeout,
      ),
      'locator.evaluate()',
    )
  }
  /** Playwright's `locator.evaluateAll()`: runs `fn(elements, arg)` inside the page. */
  async evaluateAll(fn: unknown, arg?: unknown): Promise<unknown> {
    return this.unwrap(
      await this.call('evalAll', [this.steps, fnSource(fn), arg]),
      'locator.evaluateAll()',
    )
  }
  /** Playwright's `waitFor()`: until attached, detached, visible or hidden. */
  async waitFor(
    opts: { state?: 'attached' | 'detached' | 'visible' | 'hidden'; timeout?: number } = {},
  ): Promise<void> {
    const timeout = opts.timeout ?? this.owner.defaultTimeout
    const res = await this.call('waitFor', [this.steps, opts.state ?? 'visible'], timeout)
    this.unwrap(res, 'locator.waitFor()')
  }

  /** One probe for the expect matchers; the wrapper polls it. */
  async probe(matcher: string, args: Dict): Promise<Dict> {
    return this.call('probe', [this.steps, matcher, args])
  }
}

interface DialogImpl {
  type(): string
  message(): string
  defaultValue(): string
  accept(text?: string): Promise<void>
  dismiss(): Promise<void>
}

/** The console message `page.on('console')` listeners receive. */
class ConsoleMessageImpl {
  constructor(private readonly p: E2EConsolePayload) {}
  /** Playwright's `type()`: presses each character in turn (or, on a console message, its level). */
  type(): string {
    return this.p.type
  }
  /** The body as text (for a response) or the message text (for a console message). */
  text(): string {
    return this.p.text
  }
  /** Where it was logged, when known. */
  location(): { url: string; lineNumber: number; columnNumber: number } {
    return {
      url: this.p.url ?? '',
      lineNumber: this.p.lineNumber ?? 0,
      columnNumber: this.p.columnNumber ?? 0,
    }
  }
  /** Not available over the preview: always empty. */
  args(): unknown[] {
    return []
  }
  /** The page this belongs to (null for a console message over the preview). */
  page(): null {
    return null
  }
}

/** A Playwright-shaped Page over an `E2ETransport`; `createEvaluatePage` wraps it in a Proxy. */
class PageImpl {
  readonly [E2E_PAGE] = true
  defaultTimeout: number
  navigationTimeout: number
  readonly testIdAttribute: string
  private viewport: E2EViewport | null
  private closed = false
  private proxy!: Page
  private readonly listeners = new Map<string, Set<Listener>>()
  private readonly warned = new Set<string>()
  private readonly unsubscribe: Array<() => void> = []
  readonly mouse: Dict
  readonly keyboard: Dict
  readonly touchscreen: Dict
  readonly request: Dict

  constructor(
    private readonly transport: E2ETransport,
    private readonly options: E2EPageOptions,
  ) {
    this.defaultTimeout = options.timeout ?? 10_000
    this.navigationTimeout = options.navigationTimeout ?? 15_000
    this.testIdAttribute =
      (options as { testIdAttribute?: string }).testIdAttribute ?? 'data-testid'
    this.viewport = options.viewport ?? null
    this.unsubscribe.push(
      transport.on('console', (payload) =>
        this.emit('console', new ConsoleMessageImpl(payload as E2EConsolePayload)),
      ),
      transport.on('pageerror', (payload) => {
        const p = payload as E2EErrorPayload
        const err = new Error(p.message)
        if (p.stack) err.stack = p.stack
        this.emit('pageerror', err)
      }),
      transport.on('close', () => {
        this.closed = true
        this.emit('close', this.proxy)
      }),
    )
    const mouseCall = (action: string, x: number, y: number, opts: Dict = {}): Promise<void> =>
      this.rt('mouse', [action, x, y, opts])
        .then((r) => this.check(r, `mouse.${action}()`))
        .then(() => undefined)
    this.mouse = {
      click: (x: number, y: number, opts?: Dict) => mouseCall('click', x, y, opts),
      dblclick: (x: number, y: number, opts?: Dict) => mouseCall('dblclick', x, y, opts),
      move: (x: number, y: number) => mouseCall('move', x, y),
      down: () => mouseCall('down', 0, 0),
      up: () => mouseCall('up', 0, 0),
      wheel: (dx: number, dy: number) => mouseCall('wheel', dx, dy),
    }
    const keyCall = (action: string, arg: string): Promise<void> =>
      this.rt('keyboard', [action, arg])
        .then((r) => this.check(r, `keyboard.${action}()`))
        .then(() => undefined)
    this.keyboard = {
      press: (key: string) => keyCall('press', key),
      type: (text: string) => keyCall('type', text),
      insertText: (text: string) => keyCall('insertText', text),
      down: (key: string) => keyCall('down', key),
      up: (key: string) => keyCall('up', key),
    }
    this.touchscreen = { tap: (x: number, y: number) => mouseCall('click', x, y) }
    const fetchCall = async (
      method: string,
      url: string,
      opts: Dict = {},
    ): Promise<APIResponse> => {
      const res = await this.rt(
        'fetch',
        [url, { ...opts, method }],
        opts.timeout as number | undefined,
      )
      this.check(res, `request.${method.toLowerCase()}()`)
      return new ResponseImpl(
        res.value as ConstructorParameters<typeof ResponseImpl>[0],
      ) as unknown as APIResponse
    }
    this.request = {
      get: (url: string, opts?: Dict) => fetchCall('GET', url, opts),
      post: (url: string, opts?: Dict) => fetchCall('POST', url, opts),
      put: (url: string, opts?: Dict) => fetchCall('PUT', url, opts),
      patch: (url: string, opts?: Dict) => fetchCall('PATCH', url, opts),
      delete: (url: string, opts?: Dict) => fetchCall('DELETE', url, opts),
      head: (url: string, opts?: Dict) => fetchCall('HEAD', url, opts),
      fetch: (url: string, opts?: Dict) => fetchCall(String(opts?.method ?? 'GET'), url, opts),
      dispose: async () => undefined,
      storageState: () => {
        throw new E2EUnsupportedError(
          'request.storageState()',
          'Read storage with page.evaluate(() => ({ ...localStorage })).',
          this.bondName,
        )
      },
    }
  }

  /** The bond's name, for error messages. */
  get bondName(): string {
    return this.options.bondName ?? 'this e2e bond'
  }
  /** The branded Page proxy. */
  asPage(): Page {
    return this.proxy
  }
  /** Called once by `createEvaluatePage` with the proxy that wraps this instance. */
  attachProxy(proxy: Page): void {
    this.proxy = proxy
  }
  /** Fire the listeners of one event. */
  private emit(event: string, payload: unknown): void {
    for (const fn of this.listeners.get(event) ?? []) {
      try {
        fn(payload)
      } catch (error) {
        console.error(`[app-e2e] listener for '${event}' threw`, error)
      }
    }
  }
  /** Playwright's `check()`: clicks until checked (or, on the page, throws on a failed runtime reply). */
  private check(res: Dict, what: string): Dict {
    if (res.ok === false) {
      const message = `${what}: ${String(res.error ?? 'failed')}`
      throw res.timeout ? new E2ETimeoutError(message) : new Error(message)
    }
    return res
  }

  /** Run a runtime call inside the page, installing the runtime on a fresh document. */
  async rt(fn: string, args: unknown[], timeout?: number): Promise<Dict> {
    if (this.closed) throw new Error('Target page, context or browser has been closed')
    const budget = (timeout ?? this.defaultTimeout) + 2_000
    let res = (await this.transport.evaluate(
      CALL_SOURCE,
      { fn, args, timeout: timeout ?? this.defaultTimeout },
      { timeout: budget },
    )) as Dict | null
    if (res && (res as Dict).__needInstall) {
      await this.transport.evaluate(RUNTIME_SOURCE, undefined, { timeout: 5_000 })
      res = (await this.transport.evaluate(
        CALL_SOURCE,
        { fn, args, timeout: timeout ?? this.defaultTimeout },
        { timeout: budget },
      )) as Dict | null
    }
    return (res ?? {}) as Dict
  }

  // ---- navigation ----
  /** Resolve a spec URL against `baseURL` when it is relative. */
  private resolveUrl(url: string): string {
    if (/^[a-z]+:/i.test(url)) return url
    const base = this.options.baseURL
    if (base) return new URL(url, base.endsWith('/') ? base : base + '/').href
    return url
  }
  /** Playwright's `page.goto()`: navigate and wait for the new document to load. */
  async goto(url: string, opts: { timeout?: number } = {}): Promise<null> {
    await this.transport.navigate('goto', this.resolveUrl(url), {
      timeout: opts.timeout ?? this.navigationTimeout,
    })
    this.emit('load', this.proxy)
    return null
  }
  /** Playwright's `page.reload()`. */
  async reload(opts: { timeout?: number } = {}): Promise<null> {
    await this.transport.navigate('reload', undefined, {
      timeout: opts.timeout ?? this.navigationTimeout,
    })
    this.emit('load', this.proxy)
    return null
  }
  /** Playwright's `page.goBack()`. */
  async goBack(opts: { timeout?: number } = {}): Promise<null> {
    await this.transport.navigate('back', undefined, {
      timeout: opts.timeout ?? this.navigationTimeout,
    })
    return null
  }
  /** Playwright's `page.goForward()`. */
  async goForward(opts: { timeout?: number } = {}): Promise<null> {
    await this.transport.navigate('forward', undefined, {
      timeout: opts.timeout ?? this.navigationTimeout,
    })
    return null
  }
  /** Playwright's `url()`: the last known URL (or, on a response, its final URL). */
  url(): string {
    return this.transport.url()
  }
  /** Playwright's `page.title()`. */
  async title(): Promise<string> {
    return String(((await this.rt('info', [])) as Dict).title ?? '')
  }
  /** Playwright's `page.content()`: the document's HTML. */
  async content(): Promise<string> {
    return String(
      this.check(
        await this.rt('eval', ['() => "<!DOCTYPE html>" + document.documentElement.outerHTML']),
        'page.content()',
      ).value,
    )
  }
  /** Playwright's `waitForLoadState()`: until the document is complete (plus a quiet moment for `networkidle`). */
  async waitForLoadState(state: string = 'load', opts: { timeout?: number } = {}): Promise<void> {
    const deadline = Date.now() + (opts.timeout ?? this.navigationTimeout)
    for (;;) {
      const info = await this.rt('info', [])
      if (
        info.readyState === 'complete' ||
        (state === 'domcontentloaded' && info.readyState !== 'loading')
      )
        break
      if (Date.now() > deadline)
        throw new E2ETimeoutError(
          `page.waitForLoadState(${state}): document still ${String(info.readyState)}`,
        )
      await new Promise((r) => setTimeout(r, 100))
    }
    if (state === 'networkidle') await new Promise((r) => setTimeout(r, 500))
  }
  /** Playwright's `waitForURL()`: a string (full URL or path), RegExp or predicate. */
  async waitForURL(
    url: string | RegExp | ((u: URL) => boolean),
    opts: { timeout?: number } = {},
  ): Promise<void> {
    const deadline = Date.now() + (opts.timeout ?? this.navigationTimeout)
    const matches = (current: string): boolean => {
      if (typeof url === 'function') return url(new URL(current))
      if (url instanceof RegExp) return url.test(current)
      const want = this.resolveUrl(url)
      if (/^[a-z]+:/i.test(want))
        return current === want || current.replace(/\/$/, '') === want.replace(/\/$/, '')
      const c = new URL(current)
      return (
        c.pathname + c.search + c.hash === want ||
        c.pathname === want ||
        c.pathname.replace(/\/$/, '') === want.replace(/\/$/, '')
      )
    }
    for (;;) {
      const info = await this.rt('info', [])
      if (matches(String(info.url))) return
      if (Date.now() > deadline)
        throw new E2ETimeoutError(`page.waitForURL(${String(url)}): still at ${String(info.url)}`)
      await new Promise((r) => setTimeout(r, 100))
    }
  }
  /** Playwright's `waitForTimeout()`. */
  async waitForTimeout(ms: number): Promise<void> {
    await new Promise((r) => setTimeout(r, ms))
  }
  /** Playwright's `waitForFunction()`: polls the function inside the page until it returns a truthy value. */
  async waitForFunction(
    fn: unknown,
    arg?: unknown,
    opts: { timeout?: number; polling?: number | 'raf' } = {},
  ): Promise<unknown> {
    const deadline = Date.now() + (opts.timeout ?? this.defaultTimeout)
    const interval = typeof opts.polling === 'number' ? opts.polling : 100
    for (;;) {
      const res = this.check(await this.rt('eval', [fnSource(fn), arg]), 'page.waitForFunction()')
      if (res.value) return res.value
      if (Date.now() > deadline)
        throw new E2ETimeoutError(
          'page.waitForFunction(): the function never returned a truthy value',
        )
      await new Promise((r) => setTimeout(r, interval))
    }
  }
  /** Playwright's `waitForSelector()`; returns the locator (element handles are not available). */
  async waitForSelector(
    selector: string,
    opts: { state?: 'attached' | 'detached' | 'visible' | 'hidden'; timeout?: number } = {},
  ): Promise<LocatorImpl | null> {
    const loc = this.locator(selector)
    await loc.waitFor({ state: opts.state ?? 'visible', timeout: opts.timeout })
    return opts.state === 'detached' || opts.state === 'hidden' ? null : loc
  }

  // ---- evaluation ----
  /** Playwright's `evaluate()`: runs the function inside the page and returns JSON. */
  async evaluate(fn: unknown, arg?: unknown): Promise<unknown> {
    return this.check(await this.rt('eval', [fnSource(fn), arg]), 'page.evaluate()').value
  }
  /** Playwright's `$eval()`. */
  $eval(selector: string, fn: unknown, arg?: unknown): Promise<unknown> {
    return this.locator(selector).evaluate(fn, arg)
  }
  /** Playwright's `$$eval()`. */
  $$eval(selector: string, fn: unknown, arg?: unknown): Promise<unknown> {
    return this.locator(selector).evaluateAll(fn, arg)
  }
  /** Playwright's `addStyleTag()` (inline content). */
  async addStyleTag(opts: { content?: string; url?: string }): Promise<null> {
    this.check(await this.rt('addTag', ['style', opts]), 'page.addStyleTag()')
    return null
  }
  /** Playwright's `addScriptTag()`. */
  async addScriptTag(opts: { content?: string; url?: string; type?: string }): Promise<null> {
    this.check(await this.rt('addTag', ['script', opts]), 'page.addScriptTag()')
    return null
  }

  // ---- locators ----
  /** Playwright's `locator()`: narrow to descendants matching a selector, with optional `hasText` / `has` filters. */
  locator(
    sel: string | LocatorImpl,
    opts?: {
      hasText?: string | RegExp
      hasNotText?: string | RegExp
      has?: LocatorImpl
      hasNot?: LocatorImpl
    },
  ): LocatorImpl {
    return new LocatorImpl(this, []).locator(sel, opts)
  }
  /** Playwright's `getByRole()`: by ARIA role, with accessible-name, heading-level and state options. */
  getByRole(role: string, opts?: Dict): LocatorImpl {
    return new LocatorImpl(this, []).getByRole(role, opts)
  }
  /** Playwright's `getByText()`: the smallest elements whose text matches. */
  getByText(text: string | RegExp, opts?: { exact?: boolean }): LocatorImpl {
    return new LocatorImpl(this, []).getByText(text, opts)
  }
  /** Playwright's `getByLabel()`: form controls by their label text (also `aria-label`). */
  getByLabel(text: string | RegExp, opts?: { exact?: boolean }): LocatorImpl {
    return new LocatorImpl(this, []).getByLabel(text, opts)
  }
  /** Playwright's `getByPlaceholder()`. */
  getByPlaceholder(text: string | RegExp, opts?: { exact?: boolean }): LocatorImpl {
    return new LocatorImpl(this, []).getByPlaceholder(text, opts)
  }
  /** Playwright's `getByTitle()`. */
  getByTitle(text: string | RegExp, opts?: { exact?: boolean }): LocatorImpl {
    return new LocatorImpl(this, []).getByTitle(text, opts)
  }
  /** Playwright's `getByAltText()`. */
  getByAltText(text: string | RegExp, opts?: { exact?: boolean }): LocatorImpl {
    return new LocatorImpl(this, []).getByAltText(text, opts)
  }
  /** Playwright's `getByTestId()` on the configured test-id attribute (default `data-testid`). */
  getByTestId(id: string | RegExp): LocatorImpl {
    return new LocatorImpl(this, []).getByTestId(id)
  }

  // ---- viewport ----
  /** Playwright's `setViewportSize()`: asks the host to resize the frame; throws when it did not. */
  async setViewportSize(size: E2EViewport): Promise<void> {
    const got = await this.transport.viewport(size.width, size.height)
    if (Math.abs(got.width - size.width) > 2) {
      throw new E2EUnsupportedError(
        `page.setViewportSize(${size.width}x${size.height})`,
        `The preview host did not resize the frame (it is ${got.width}x${got.height}). Open the project's preview inside the molecule.dev IDE, which honours viewport requests; a preview opened in a plain browser tab keeps the tab's size.`,
        this.bondName,
      )
    }
    this.viewport = got
  }
  /** Apply the configured viewport without failing the test when the host cannot resize (used once at connect). */
  async applyInitialViewport(): Promise<void> {
    if (!this.viewport) return
    try {
      const got = await this.transport.viewport(this.viewport.width, this.viewport.height)
      if (Math.abs(got.width - this.viewport.width) > 2)
        this.warnOnce(
          'viewport',
          `[app-e2e] the preview host kept its own size (${got.width}x${got.height}); the configured viewport ${this.viewport.width}x${this.viewport.height} was not applied. Open the preview inside the molecule.dev IDE to test other widths.`,
        )
      this.viewport = got
    } catch (error) {
      this.warnOnce(
        'viewport',
        `[app-e2e] could not apply the configured viewport: ${String(error)}`,
      )
    }
  }
  /** Playwright's `viewportSize()`. */
  viewportSize(): E2EViewport | null {
    return this.viewport
  }
  /** Log a warning once per key. */
  private warnOnce(key: string, message: string): void {
    if (this.warned.has(key)) return
    this.warned.add(key)
    console.warn(message)
  }

  // ---- events ----
  /** Playwright's `page.on()`: console, pageerror, dialog, close and load fire over the preview; network events never do (warned once). */
  on(event: string, fn: Listener): Page {
    if (
      [
        'request',
        'response',
        'requestfinished',
        'requestfailed',
        'download',
        'popup',
        'websocket',
        'worker',
        'frameattached',
        'framedetached',
        'framenavigated',
        'filechooser',
        'crash',
        'domcontentloaded',
      ].includes(event)
    ) {
      this.warnOnce(
        'event:' + event,
        `[app-e2e] page.on('${event}') never fires with ${this.bondName}; network and browser events need a real browser. Use page.request or page.evaluate(() => fetch(...)) to observe responses.`,
      )
    }
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(fn)
    return this.proxy
  }
  /** Alias of `on()`. */
  addListener(event: string, fn: Listener): Page {
    return this.on(event, fn)
  }
  /** Playwright's `page.once()`. */
  once(event: string, fn: Listener): Page {
    const wrapped: Listener = (payload) => {
      this.off(event, wrapped)
      fn(payload)
    }
    return this.on(event, wrapped)
  }
  /** Playwright's `page.off()`. */
  off(event: string, fn: Listener): Page {
    this.listeners.get(event)?.delete(fn)
    return this.proxy
  }
  /** Alias of `off()`. */
  removeListener(event: string, fn: Listener): Page {
    return this.off(event, fn)
  }
  /** Playwright's `removeAllListeners()`. */
  removeAllListeners(event?: string): Page {
    if (event) this.listeners.delete(event)
    else this.listeners.clear()
    return this.proxy
  }
  /** Called by a transport that forwards dialogs (the preview client auto-accepts them). */
  emitDialog(dialog: DialogImpl): void {
    this.emit('dialog', dialog)
  }

  // ---- lifecycle ----
  /** Playwright's `page.close()`: releases the transport. */
  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    for (const un of this.unsubscribe) un()
    await this.transport.close()
    this.emit('close', this.proxy)
  }
  /** Playwright's `isClosed()`. */
  isClosed(): boolean {
    return this.closed
  }
  /** No-op over the preview: the page is already in front. */
  async bringToFront(): Promise<void> {
    /* the preview is already the front page */
  }
  /** Playwright's `setDefaultTimeout()`. */
  setDefaultTimeout(ms: number): void {
    this.defaultTimeout = ms
  }
  /** Playwright's `setDefaultNavigationTimeout()`. */
  setDefaultNavigationTimeout(ms: number): void {
    this.navigationTimeout = ms
  }
  /** No-op: there is no inspector to pause in. */
  async pause(): Promise<void> {
    /* no inspector to pause in */
  }
  /** The page itself, standing in for the main frame. */
  mainFrame(): Frame {
    return this.proxy as unknown as Frame
  }
  /** The main frame only. */
  frames(): Frame[] {
    return [this.mainFrame()]
  }
  /** Always empty over the preview. */
  workers(): unknown[] {
    return []
  }
  /** Always null over the preview. */
  opener(): null {
    return null
  }
  /** Always null: no recording over the preview. */
  video(): null {
    return null
  }
  /** A minimal BrowserContext: pages, timeouts and no-op tracing; the rest throws naming the alternative. */
  context(): BrowserContext {
    const page = this.proxy
    const ctx: Dict = {
      pages: () => [page],
      close: () => this.close(),
      setDefaultTimeout: (ms: number) => this.setDefaultTimeout(ms),
      setDefaultNavigationTimeout: (ms: number) => this.setDefaultNavigationTimeout(ms),
      grantPermissions: async () => undefined,
      clearPermissions: async () => undefined,
      browser: () => null,
      on: () => ctx,
      once: () => ctx,
      off: () => ctx,
      addListener: () => ctx,
      removeListener: () => ctx,
      tracing: {
        start: async () => undefined,
        stop: async () => undefined,
        startChunk: async () => undefined,
        stopChunk: async () => undefined,
        group: async () => undefined,
        groupEnd: async () => undefined,
      },
      request: this.request,
      serviceWorkers: () => [],
      backgroundPages: () => [],
    }
    const bond = this.bondName
    return new Proxy(ctx, {
      get(target, prop) {
        if (typeof prop === 'symbol' || prop in target) return target[prop as string]
        if (prop === 'then') return undefined
        if (prop in CONTEXT_UNSUPPORTED) {
          return () => {
            throw new E2EUnsupportedError(`context.${prop}()`, CONTEXT_UNSUPPORTED[prop], bond)
          }
        }
        return undefined
      },
    }) as unknown as BrowserContext
  }
}

const wrapLocator = (impl: LocatorImpl, bond: string): Locator =>
  new Proxy(impl, {
    get(target, prop, receiver) {
      if (typeof prop === 'symbol' || prop in target) {
        const value = Reflect.get(target, prop, receiver)
        if (
          typeof value === 'function' &&
          typeof prop === 'string' &&
          !['constructor', 'toString', 'describe', 'page'].includes(prop)
        ) {
          return (...args: unknown[]) => {
            const result = (value as (...a: unknown[]) => unknown).apply(target, args)
            // Chainable builders return LocatorImpl synchronously; wrap them so the branded proxy travels.
            if (result instanceof LocatorImpl) return wrapLocator(result, bond)
            if (result instanceof Promise)
              return result.then((v) =>
                Array.isArray(v) && v.every((x) => x instanceof LocatorImpl)
                  ? v.map((x) => wrapLocator(x as LocatorImpl, bond))
                  : v,
              )
            return result
          }
        }
        return value
      }
      if (prop === 'then') return undefined
      if (prop in UNSUPPORTED_LOCATOR) {
        return () => {
          throw new E2EUnsupportedError(`locator.${prop}()`, UNSUPPORTED_LOCATOR[prop], bond)
        }
      }
      return undefined
    },
  }) as unknown as Locator

/**
 * Build a Playwright-shaped `Page` over a transport. Bonds call this from
 * `connect()`; the returned object carries the documented subset and throws an
 * {@link E2EUnsupportedError} naming the alternative for the rest.
 */
export const createEvaluatePage = async (
  transport: E2ETransport,
  options: E2EPageOptions = {},
): Promise<Page> => {
  const impl = new PageImpl(transport, options)
  const bond = impl.bondName
  const proxy = new Proxy(impl, {
    get(target, prop, receiver) {
      if (typeof prop === 'symbol' || prop in target) {
        const value = Reflect.get(target, prop, receiver)
        if (
          typeof value === 'function' &&
          typeof prop === 'string' &&
          !['constructor', 'asPage', 'attachProxy', 'rt'].includes(prop)
        ) {
          return (...args: unknown[]) => {
            const result = (value as (...a: unknown[]) => unknown).apply(target, args)
            if (result instanceof LocatorImpl) return wrapLocator(result, bond)
            if (result instanceof Promise)
              return result.then((v) => (v instanceof LocatorImpl ? wrapLocator(v, bond) : v))
            return result
          }
        }
        return value
      }
      if (prop === 'then') return undefined
      if (prop in UNSUPPORTED_PAGE) {
        return () => {
          throw new E2EUnsupportedError(`page.${prop}()`, UNSUPPORTED_PAGE[prop], bond)
        }
      }
      return () => {
        throw new E2EUnsupportedError(`page.${String(prop)}()`, defaultAlternative, bond)
      }
    },
  }) as unknown as Page
  impl.attachProxy(proxy)
  await impl.applyInitialViewport()
  return proxy
}

/** Whether a value is a locator built by {@link createEvaluatePage}. */
export const isE2ELocator = (value: unknown): value is LocatorImpl =>
  !!value && typeof value === 'object' && (value as Record<symbol, unknown>)[E2E_LOCATOR] === true

/** Whether a value is a page built by {@link createEvaluatePage}. */
export const isE2EPage = (value: unknown): value is PageImpl =>
  !!value && typeof value === 'object' && (value as Record<symbol, unknown>)[E2E_PAGE] === true

export type { LocatorImpl as E2ELocatorImpl, PageImpl as E2EPageImpl }
export { toMatch as textMatch, toFull as textMatchFull }

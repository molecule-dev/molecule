/**
 * `expect` that routes locators and pages built by {@link createEvaluatePage}
 * to polling matchers of their own, and everything else — values, real
 * Playwright locators — to Playwright's `expect` untouched.
 *
 * @module
 */

import { expect as playwrightExpect, test as playwrightTest } from '@playwright/test'

import { E2EStrictModeError } from '@molecule/app-e2e'

import {
  type E2ELocatorImpl,
  type E2EPageImpl,
  isE2ELocator,
  isE2EPage,
  textMatch,
  textMatchFull,
} from './page.js'
import type { TextMatch } from './runtime.js'

type Dict = Record<string, unknown>
type Expectation = string | RegExp

interface MatcherDefaults {
  timeout?: number
  soft?: boolean
  message?: string
}

const DEFAULT_TIMEOUT = 5_000

const pretty = (value: unknown): string =>
  typeof value === 'string' ? JSON.stringify(value) : (JSON.stringify(value) ?? String(value))

const expectationText = (expected: unknown): string => {
  if (expected instanceof RegExp) return String(expected)
  if (Array.isArray(expected))
    return JSON.stringify(expected.map((e) => (e instanceof RegExp ? String(e) : e)))
  return pretty(expected)
}

const failure = (
  subject: string,
  matcher: string,
  describeSubject: string,
  expected: string,
  received: unknown,
  timeout: number,
  negate: boolean,
  message?: string,
): Error => {
  const lines = [
    `${message ?? `expect(${subject}).${negate ? 'not.' : ''}${matcher}() failed`}`,
    '',
    `${subject === 'page' ? 'Page' : 'Locator'}: ${describeSubject}`,
    `Expected: ${negate ? 'not ' : ''}${expected}`,
    `Received: ${pretty(received)}`,
    `Timeout: ${timeout}ms`,
  ]
  const err = new Error(lines.join('\n'))
  err.name = 'Error'
  return err
}

interface SoftFailSink {
  _failWithError?: (e: Error) => void
}

const record = (soft: boolean, err: Error): void => {
  if (!soft) throw err
  let info: SoftFailSink | null
  try {
    info = playwrightTest.info() as unknown as SoftFailSink
  } catch (_error) {
    info = null
  }
  if (info && typeof info._failWithError === 'function') info._failWithError(err)
  else throw err
}

const toMatchArg = (
  expected: Expectation | Expectation[],
  full: boolean,
  opts?: { ignoreCase?: boolean },
): TextMatch | TextMatch[] =>
  Array.isArray(expected)
    ? expected.map((e) => (full ? textMatchFull(e, opts) : textMatch(e, opts)))
    : full
      ? textMatchFull(expected, opts)
      : textMatch(expected, opts)

const locatorMatchers = (
  locator: E2ELocatorImpl,
  defaults: MatcherDefaults,
  negate = false,
): Dict => {
  const run = async (
    matcher: string,
    args: Dict,
    expected: string,
    opts?: { timeout?: number },
  ): Promise<void> => {
    const timeout = opts?.timeout ?? defaults.timeout ?? DEFAULT_TIMEOUT
    const deadline = Date.now() + timeout
    let last: unknown
    let delay = 100
    for (;;) {
      const res = await locator.probe(matcher, args)
      if (res.strict) {
        record(!!defaults.soft, new E2EStrictModeError(locator.describe(), Number(res.count)))
        return
      }
      if (res.error) {
        record(!!defaults.soft, new Error(`expect(locator).${matcher}(): ${String(res.error)}`))
        return
      }
      last = res.received
      if (Boolean(res.pass) !== negate) return
      if (Date.now() > deadline) {
        record(
          !!defaults.soft,
          failure(
            'locator',
            matcher,
            locator.describe(),
            expected,
            last,
            timeout,
            negate,
            defaults.message,
          ),
        )
        return
      }
      await new Promise((r) => setTimeout(r, delay))
      delay = Math.min(delay * 2, 500)
    }
  }
  const timeoutOf = (opts?: Dict): { timeout?: number } | undefined =>
    opts && typeof opts.timeout === 'number' ? { timeout: opts.timeout } : undefined
  const matchers: Dict = {
    toBeVisible: (opts?: Dict) => run('toBeVisible', {}, 'visible', timeoutOf(opts)),
    toBeHidden: (opts?: Dict) => run('toBeHidden', {}, 'hidden', timeoutOf(opts)),
    toBeAttached: (opts?: Dict) => run('toBeAttached', {}, 'attached', timeoutOf(opts)),
    toHaveCount: (n: number, opts?: Dict) => run('toHaveCount', { n }, String(n), timeoutOf(opts)),
    toHaveText: (expected: Expectation | Expectation[], opts?: Dict) =>
      run(
        'toHaveText',
        {
          expected: toMatchArg(expected, true, {
            ignoreCase: opts?.ignoreCase as boolean | undefined,
          }),
          useInnerText: opts?.useInnerText,
        },
        expectationText(expected),
        timeoutOf(opts),
      ),
    toContainText: (expected: Expectation | Expectation[], opts?: Dict) =>
      run(
        'toContainText',
        {
          expected: toMatchArg(expected, false, {
            ignoreCase: opts?.ignoreCase as boolean | undefined,
          }),
          useInnerText: opts?.useInnerText,
        },
        `containing ${expectationText(expected)}`,
        timeoutOf(opts),
      ),
    toHaveAttribute: (name: string, expected?: Expectation | Dict, opts?: Dict) => {
      const valueGiven =
        expected !== undefined && !(typeof expected === 'object' && !(expected instanceof RegExp))
      const options = (valueGiven ? opts : (expected as Dict | undefined)) ?? {}
      return run(
        'toHaveAttribute',
        {
          name,
          expected: valueGiven
            ? textMatchFull(expected as Expectation, {
                ignoreCase: options.ignoreCase as boolean | undefined,
              })
            : undefined,
        },
        valueGiven ? `${name}=${expectationText(expected)}` : `attribute ${name}`,
        timeoutOf(options),
      )
    },
    toHaveClass: (expected: Expectation | Expectation[], opts?: Dict) =>
      run(
        'toHaveClass',
        { expected: toMatchArg(expected, true) },
        `class ${expectationText(expected)}`,
        timeoutOf(opts),
      ),
    toContainClass: (expected: string, opts?: Dict) =>
      run('toContainClass', { expected }, `classes ${expectationText(expected)}`, timeoutOf(opts)),
    toHaveCSS: (name: string, expected: Expectation, opts?: Dict) =>
      run(
        'toHaveCSS',
        { name, expected: textMatchFull(expected) },
        `${name}: ${expectationText(expected)}`,
        timeoutOf(opts),
      ),
    toHaveValue: (expected: Expectation, opts?: Dict) =>
      run(
        'toHaveValue',
        { expected: textMatchFull(expected) },
        `value ${expectationText(expected)}`,
        timeoutOf(opts),
      ),
    toHaveValues: (expected: Expectation[], opts?: Dict) =>
      run(
        'toHaveValues',
        { expected: toMatchArg(expected, true) },
        `values ${expectationText(expected)}`,
        timeoutOf(opts),
      ),
    toHaveId: (expected: Expectation, opts?: Dict) =>
      run(
        'toHaveId',
        { expected: textMatchFull(expected) },
        `id ${expectationText(expected)}`,
        timeoutOf(opts),
      ),
    toHaveJSProperty: (name: string, expected: unknown, opts?: Dict) =>
      run(
        'toHaveJSProperty',
        { name, expected },
        `${name} = ${expectationText(expected)}`,
        timeoutOf(opts),
      ),
    toBeChecked: (opts?: Dict) =>
      run(
        'toBeChecked',
        { checked: opts?.checked },
        opts?.checked === false ? 'unchecked' : 'checked',
        timeoutOf(opts),
      ),
    toBeEnabled: (opts?: Dict) => run('toBeEnabled', {}, 'enabled', timeoutOf(opts)),
    toBeDisabled: (opts?: Dict) => run('toBeDisabled', {}, 'disabled', timeoutOf(opts)),
    toBeEditable: (opts?: Dict) => run('toBeEditable', {}, 'editable', timeoutOf(opts)),
    toBeEmpty: (opts?: Dict) => run('toBeEmpty', {}, 'empty', timeoutOf(opts)),
    toBeFocused: (opts?: Dict) => run('toBeFocused', {}, 'focused', timeoutOf(opts)),
    toBeInViewport: (opts?: Dict) =>
      run('toBeInViewport', { ratio: opts?.ratio }, 'in viewport', timeoutOf(opts)),
    toHaveAccessibleName: (expected: Expectation, opts?: Dict) =>
      run(
        'toHaveAccessibleName',
        {
          expected: textMatchFull(expected, {
            ignoreCase: opts?.ignoreCase as boolean | undefined,
          }),
        },
        `accessible name ${expectationText(expected)}`,
        timeoutOf(opts),
      ),
    toHaveRole: (expected: string, opts?: Dict) =>
      run('toHaveRole', { expected }, `role ${expectationText(expected)}`, timeoutOf(opts)),
  }
  if (!negate) matchers.not = locatorMatchers(locator, defaults, true)
  return new Proxy(matchers, {
    get(target, prop) {
      if (typeof prop === 'symbol' || prop in target) return target[prop as string]
      if (prop === 'then') return undefined
      return () => {
        throw new Error(
          `expect(locator).${String(prop)}() is not supported by the e2e core over the preview. Supported: ${Object.keys(
            matchers,
          )
            .filter((k) => k !== 'not')
            .join(
              ', ',
            )}. For anything else read the value (textContent, boundingBox, evaluate) and assert on it.`,
        )
      }
    },
  })
}

const pageMatchers = (page: E2EPageImpl, defaults: MatcherDefaults, negate = false): Dict => {
  const poll = async (
    matcher: string,
    expected: Expectation,
    describe: string,
    read: () => Promise<string>,
    test: (value: string) => boolean,
    opts?: Dict,
  ): Promise<void> => {
    const timeout = (opts?.timeout as number | undefined) ?? defaults.timeout ?? DEFAULT_TIMEOUT
    const deadline = Date.now() + timeout
    let last: string
    for (;;) {
      last = await read()
      if (test(last) !== negate) return
      if (Date.now() > deadline) {
        record(
          !!defaults.soft,
          failure(
            'page',
            matcher,
            describe,
            expectationText(expected),
            last,
            timeout,
            negate,
            defaults.message,
          ),
        )
        return
      }
      await new Promise((r) => setTimeout(r, 100))
    }
  }
  const matchers: Dict = {
    toHaveTitle: (expected: Expectation, opts?: Dict) =>
      poll(
        'toHaveTitle',
        expected,
        page.url(),
        () => page.title(),
        (t) =>
          expected instanceof RegExp
            ? expected.test(t)
            : t.replace(/\s+/g, ' ').trim() === expected.replace(/\s+/g, ' ').trim(),
        opts,
      ),
    toHaveURL: (expected: Expectation, opts?: Dict) =>
      poll(
        'toHaveURL',
        expected,
        page.url(),
        async () => String((await page.rt('info', [])).url ?? page.url()),
        (current) => {
          if (expected instanceof RegExp) return expected.test(current)
          if (/^[a-z]+:/i.test(expected))
            return (
              current === expected || current.replace(/\/$/, '') === expected.replace(/\/$/, '')
            )
          const u = new URL(current)
          const path = u.pathname + u.search + u.hash
          return (
            path === expected ||
            u.pathname === expected ||
            u.pathname.replace(/\/$/, '') === expected.replace(/\/$/, '')
          )
        },
        opts,
      ),
  }
  if (!negate) matchers.not = pageMatchers(page, defaults, true)
  return new Proxy(matchers, {
    get(target, prop) {
      if (typeof prop === 'symbol' || prop in target) return target[prop as string]
      if (prop === 'then') return undefined
      return () => {
        throw new Error(
          `expect(page).${String(prop)}() is not supported over the preview. Supported: toHaveTitle, toHaveURL. Screenshots need a real browser; assert layout with locator.boundingBox() and page.evaluate().`,
        )
      }
    },
  })
}

type AnyExpect = typeof playwrightExpect

const wrap = (base: AnyExpect, defaults: MatcherDefaults): AnyExpect =>
  new Proxy(base, {
    apply(target, thisArg, args: unknown[]) {
      const [actual, messageOrOptions] = args
      const message =
        typeof messageOrOptions === 'string'
          ? messageOrOptions
          : (messageOrOptions as { message?: string } | undefined)?.message
      if (isE2ELocator(actual))
        return locatorMatchers(actual, { ...defaults, message: message ?? defaults.message })
      if (isE2EPage(actual))
        return pageMatchers(actual, { ...defaults, message: message ?? defaults.message })
      return Reflect.apply(target as unknown as (...a: unknown[]) => unknown, thisArg, args)
    },
    get(target, prop, receiver) {
      if (prop === 'soft') {
        const soft = Reflect.get(target, prop, receiver) as AnyExpect['soft']
        return (actual: unknown, messageOrOptions?: unknown) => {
          const message =
            typeof messageOrOptions === 'string'
              ? messageOrOptions
              : (messageOrOptions as { message?: string } | undefined)?.message
          if (isE2ELocator(actual))
            return locatorMatchers(actual, { ...defaults, soft: true, message })
          if (isE2EPage(actual)) return pageMatchers(actual, { ...defaults, soft: true, message })
          return (soft as (a: unknown, m?: unknown) => unknown)(actual, messageOrOptions)
        }
      }
      if (prop === 'configure') {
        const configure = Reflect.get(target, prop, receiver) as AnyExpect['configure']
        return (opts: { timeout?: number; soft?: boolean; message?: string }) =>
          wrap(configure(opts) as AnyExpect, { ...defaults, ...opts })
      }
      return Reflect.get(target, prop, receiver)
    },
  })

/**
 * Playwright's `expect`, plus polling matchers for pages and locators built
 * over the preview. `expect(value)`, `expect.soft`, `expect.poll`,
 * `expect.configure` and the asymmetric matchers behave exactly as in
 * Playwright.
 */
export const expect: AnyExpect = wrap(playwrightExpect, {})

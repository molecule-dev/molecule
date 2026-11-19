/**
 * `runUIConformance(adapter)`: registers one vitest test per component case
 * and compares the framework's result with the React reference goldens.
 *
 * Every `@molecule/app-ui-*` package calls this from its own
 * `src/__tests__/conformance.test.ts`, so a change to a UI package, to the
 * cases or to the goldens re-runs that package's conformance in CI.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { watchConformanceEventLoop } from '../stall-watchdog-vitest.js'
import * as allCases from './cases/index.js'
import { PSEUDO_LOCALE } from './environment.js'
import goldensJson from './goldens.json' with { type: 'json' }
import { currentReadable } from './normalize.js'
import { writePixelCapture } from './pixel-capture.js'
import type {
  AppComposition,
  CaseResult,
  FrameworkAdapter,
  UICase,
  UIComponentCases,
} from './spec.js'

/** The React reference, recorded by the kit's goldens test. */
export interface UIGoldens {
  /** Every name `@molecule/app-ui-react` exports; each framework exports the same names. */
  exports: string[]
  /** Component → case name → result. */
  cases: Record<string, Record<string, CaseResult>>
}

/**
 * A component's first case, then a locale switch: its translated text must change language
 * at once, as React's does through `useTranslation()`.
 *
 * @param family - One component's cases.
 * @returns The family with that case added.
 */
export const withLocaleSwitch = (family: UIComponentCases): UIComponentCases => {
  const [first] = family.cases
  if (!first) return family
  const switched: UICase = {
    ...first,
    name: `${first.name}, then a locale switch`,
    interactions: [...(first.interactions ?? []), { type: 'locale', locale: PSEUDO_LOCALE }],
  }
  return { ...family, cases: [...family.cases, switched] }
}

/**
 * For each keyed list the family declares, its base case with the rendered items marked and
 * then the same items passed again as new, equal objects; and the same with the items
 * reversed. React keeps (and on a reorder, moves) the nodes whose key is unchanged.
 *
 * @param family - One component's cases.
 * @returns The family with those cases added.
 */
export const withKeyedLists = (family: UIComponentCases): UIComponentCases => {
  const derived = (family.keyedLists ?? []).flatMap(({ prop, selector, caseName }) => {
    const base = caseName ? family.cases.find((c) => c.name === caseName) : family.cases[0]
    if (!base) throw new Error(`${family.component}: keyed list case "${caseName}" not found`)
    const items = base.props?.[prop]
    if (!Array.isArray(items) || items.length < 2)
      throw new Error(`${family.component} "${base.name}": ${prop} must list at least two items`)
    const again = (name: string, next: unknown[]): UICase => ({
      ...base,
      name: `${base.name}, then ${prop} ${name}`,
      interactions: [
        ...(base.interactions ?? []),
        { type: 'mark', selector },
        { type: 'props', props: { [prop]: next } },
      ],
    })
    return [
      again('again as equal new objects', structuredClone(items)),
      again('reversed', structuredClone(items).reverse()),
    ]
  })
  return derived.length ? { ...family, cases: [...family.cases, ...derived] } : family
}

/** Every case family, in a stable order, each with its locale-switch and keyed-list cases. */
export const uiCaseFamilies: UIComponentCases[] = (Object.values(allCases) as UIComponentCases[])
  .sort((a, b) => a.component.localeCompare(b.component))
  .map(withLocaleSwitch)
  .map(withKeyedLists)

/** The React reference results every framework must reproduce. */
export const uiGoldens: UIGoldens = goldensJson

/**
 * Cases that do not match yet, per component. `'(export)'` under any React
 * export name (a component, a compound part, a hook, a utility) means it is
 * not exported at all. Listed entries run as expected failures, so the list
 * can only shrink: an entry that starts matching fails until removed.
 */
export type UIKnownGaps = Record<string, string[]>

/** Options for {@link runUIConformance}. */
export interface UIConformanceOptions {
  /** Cases this package does not match yet. */
  knownGaps?: UIKnownGaps
}

const here = dirname(fileURLToPath(import.meta.url))

/**
 * Where the golden recorders write copies with real class names, for local
 * failure messages only (never committed).
 *
 * @param file - The cache file name.
 * @returns Its path under the kit's `node_modules/.cache`.
 */
export const goldensCachePath = (file: string): string =>
  join(here, '..', '..', 'node_modules', '.cache', 'framework-conformance', file)

const READABLE_GOLDENS = goldensCachePath('goldens.readable.json')

/**
 * Reads a readable-goldens cache file, when the recorder wrote one.
 *
 * @param path - The cache file.
 * @returns Its contents, or null when absent.
 */
export function readGoldensCache<T>(path: string): T | null {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch (error) {
    throw new Error(`framework-conformance: ${path} is not valid JSON; delete it`, {
      cause: error,
    })
  }
}

/**
 * A comma-separated list from an environment variable.
 *
 * @param name - The variable.
 * @returns Its entries, or null when unset.
 */
export const onlyFromEnv = (name: string): string[] | null =>
  process.env[name]
    ? process.env[name]!.split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : null

/**
 * How long one conformance case may take, whatever the package's own `testTimeout`. A case
 * mounts, steps and serializes in a second or two, but the first case in a file also pays
 * the framework's compile and module warm-up: Angular's took over 10 s on a loaded machine,
 * so the packages' 10 s default failed cases that matched. A case that hangs still fails.
 */
export const CONFORMANCE_CASE_TIMEOUT_MS = 60_000

/** One reference package's cases and goldens, as {@link runCaseSuite} compares them. */
export interface CaseSuite {
  /** The describe title (`vue UI conformance`). */
  title: string
  /** The React reference package, named in failure messages. */
  reference: string
  /** Every runtime name the reference exports. */
  exports: readonly string[]
  /** Case families, each with its derived cases. */
  families: UIComponentCases[]
  /** Component → case name → React result. */
  goldens: Record<string, Record<string, CaseResult>>
  /** The same goldens with real class names, for failure messages, when recorded locally. */
  readable: Record<string, Record<string, CaseResult>> | null
  /** Whether `CONFORMANCE_COMPONENTS` narrowed the families (skips the exports check). */
  narrowed: boolean
  /** Mount every case through the binding's full composition root (`RunOptions.app`). */
  app?: AppComposition
}

/**
 * Registers one conformance suite: the known gaps name real cases, every
 * reference export exists, and every case reproduces its React golden.
 *
 * @param suite - The reference package's cases and goldens.
 * @param adapter - The framework's adapter.
 * @param gaps - Cases this package does not match yet.
 */
export function runCaseSuite(suite: CaseSuite, adapter: FrameworkAdapter, gaps: UIKnownGaps): void {
  describe(suite.title, () => {
    // A case's timeout is a timer: it cannot fire while a port spins in a microtask loop.
    watchConformanceEventLoop()
    it('lists only components and cases that exist', () => {
      for (const [component, names] of Object.entries(gaps)) {
        expect(
          suite.exports,
          `known gap names ${component}, which ${suite.reference} does not export`,
        ).toContain(component)
        const family = suite.families.find((f) => f.component === component)
        for (const name of names) {
          if (name === '(export)') continue
          expect(
            family?.cases.some((c) => c.name === name) ?? false,
            `known gap ${component} / ${name} names no case`,
          ).toBe(true)
        }
      }
    })

    describe.skipIf(suite.narrowed)('exports', () => {
      for (const name of suite.exports) {
        const gap = gaps[name]?.includes('(export)') ?? false
        ;(gap ? it.fails : it)(name, () => {
          expect(adapter.exportNames, `${adapter.name} exports ${name}`).toContain(name)
        })
      }
    })

    for (const family of suite.families) {
      describe(family.component, () => {
        const exportGap = gaps[family.component]?.includes('(export)') ?? false
        ;(exportGap ? it.fails : it)('is exported', () => {
          expect(adapter.has(family.component), `${adapter.name} exports ${family.component}`).toBe(
            true,
          )
        })
        for (const testCase of family.cases) {
          const gap = exportGap || (gaps[family.component]?.includes(testCase.name) ?? false)
          ;(gap ? it.fails : it)(
            testCase.name,
            async () => {
              const expected = suite.goldens[family.component]?.[testCase.name]
              if (!expected) {
                throw new Error(
                  `no golden for ${family.component} / ${testCase.name}: record them in @molecule/app-framework-conformance`,
                )
              }
              if (!adapter.has(family.component))
                throw new Error(`${adapter.name} does not export ${family.component}`)
              const actual = await adapter.run(
                family.component,
                testCase,
                suite.app ? { app: suite.app } : undefined,
              )
              if (actual.pages) {
                writePixelCapture(adapter.name, {
                  reference: suite.reference,
                  component: family.component,
                  case: testCase.name,
                  pages: actual.pages,
                })
              }
              // The readable copy is a local cache: it helps only while it still matches the
              // committed golden.
              const readableExpected = currentReadable(
                suite.readable?.[family.component]?.[testCase.name]?.snapshots,
                expected.snapshots,
              )
              for (let i = 0; i < expected.snapshots.length; i++) {
                const step =
                  i === 0
                    ? 'after mount'
                    : `after step ${i} (${testCase.interactions?.[i - 1]?.type})`
                if (
                  readableExpected &&
                  actual.readable &&
                  actual.snapshots[i] !== expected.snapshots[i]
                ) {
                  // Real class names on both sides make the diff readable.
                  expect(actual.readable[i], step).toBe(readableExpected[i])
                }
                expect(actual.snapshots[i], step).toBe(expected.snapshots[i])
              }
              expect(actual.calls, 'callback and service calls').toEqual(expected.calls)
            },
            CONFORMANCE_CASE_TIMEOUT_MS,
          )
        }
      })
    }
  })
}

/**
 * Registers the UI conformance suite for one framework.
 *
 * `CONFORMANCE_COMPONENTS=Button,Modal` narrows a local run.
 *
 * @param adapter - The framework's adapter.
 * @param options - Known gaps.
 */
export function runUIConformance(
  adapter: FrameworkAdapter,
  options: UIConformanceOptions = {},
): void {
  const filter = onlyFromEnv('CONFORMANCE_COMPONENTS')
  runCaseSuite(
    {
      title: `${adapter.name} UI conformance`,
      reference: '@molecule/app-ui-react',
      exports: uiGoldens.exports,
      families: uiCaseFamilies.filter((f) => !filter || filter.includes(f.component)),
      goldens: uiGoldens.cases,
      readable: readGoldensCache<UIGoldens>(READABLE_GOLDENS)?.cases ?? null,
      narrowed: filter !== null,
    },
    adapter,
    options.knownGaps ?? {},
  )
}

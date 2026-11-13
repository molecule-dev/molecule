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

import * as allCases from './cases/index.js'
import { PSEUDO_LOCALE } from './environment.js'
import goldensJson from './goldens.json' with { type: 'json' }
import type { CaseResult, FrameworkAdapter, UICase, UIComponentCases } from './spec.js'

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
const withLocaleSwitch = (family: UIComponentCases): UIComponentCases => {
  const [first] = family.cases
  if (!first) return family
  const switched: UICase = {
    ...first,
    name: `${first.name}, then a locale switch`,
    interactions: [...(first.interactions ?? []), { type: 'locale', code: PSEUDO_LOCALE }],
  }
  return { ...family, cases: [...family.cases, switched] }
}

/** Every case family, in a stable order, each with its locale-switch case. */
export const uiCaseFamilies: UIComponentCases[] = (Object.values(allCases) as UIComponentCases[])
  .sort((a, b) => a.component.localeCompare(b.component))
  .map(withLocaleSwitch)

/** The React reference results every framework must reproduce. */
export const uiGoldens = goldensJson as unknown as UIGoldens

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
/** Written by the golden recorder with real class names, for local failure messages only (never committed). */
const READABLE_GOLDENS = join(
  here,
  '..',
  '..',
  'node_modules',
  '.cache',
  'framework-conformance',
  'goldens.readable.json',
)

const readableGoldens = (): UIGoldens['cases'] | null => {
  if (!existsSync(READABLE_GOLDENS)) return null
  try {
    return (JSON.parse(readFileSync(READABLE_GOLDENS, 'utf8')) as UIGoldens).cases
  } catch (error) {
    throw new Error(`framework-conformance: ${READABLE_GOLDENS} is not valid JSON; delete it`, {
      cause: error,
    })
  }
}

const only = (name: string): string[] | null =>
  process.env[name]
    ? process.env[name]!.split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : null

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
  const gaps = options.knownGaps ?? {}
  const filter = only('CONFORMANCE_COMPONENTS')
  const families = uiCaseFamilies.filter((f) => !filter || filter.includes(f.component))
  const readable = readableGoldens()

  describe(`${adapter.name} UI conformance`, () => {
    it('lists only components and cases that exist', () => {
      for (const [component, names] of Object.entries(gaps)) {
        expect(
          uiGoldens.exports,
          `known gap names ${component}, which React does not export`,
        ).toContain(component)
        const family = uiCaseFamilies.find((f) => f.component === component)
        for (const name of names) {
          if (name === '(export)') continue
          expect(
            family?.cases.some((c) => c.name === name) ?? false,
            `known gap ${component} / ${name} names no case`,
          ).toBe(true)
        }
      }
    })

    describe.skipIf(filter !== null)('exports', () => {
      for (const name of uiGoldens.exports) {
        const gap = gaps[name]?.includes('(export)') ?? false
        ;(gap ? it.fails : it)(name, () => {
          expect(adapter.exportNames, `${adapter.name} exports ${name}`).toContain(name)
        })
      }
    })

    for (const family of families) {
      describe(family.component, () => {
        const exportGap = gaps[family.component]?.includes('(export)') ?? false
        ;(exportGap ? it.fails : it)('is exported', () => {
          expect(adapter.has(family.component), `${adapter.name} exports ${family.component}`).toBe(
            true,
          )
        })
        for (const testCase of family.cases) {
          const gap = exportGap || (gaps[family.component]?.includes(testCase.name) ?? false)
          ;(gap ? it.fails : it)(testCase.name, async () => {
            const expected = uiGoldens.cases[family.component]?.[testCase.name]
            if (!expected) {
              throw new Error(
                `no golden for ${family.component} / ${testCase.name}: record them in @molecule/app-framework-conformance`,
              )
            }
            if (!adapter.has(family.component))
              throw new Error(`${adapter.name} does not export ${family.component}`)
            const actual = await adapter.run(family.component, testCase)
            const readableExpected = readable?.[family.component]?.[testCase.name]?.snapshots
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
          })
        }
      })
    }
  })
}

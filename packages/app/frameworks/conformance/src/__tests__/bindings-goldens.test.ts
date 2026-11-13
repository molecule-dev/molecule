/**
 * The React reference for binding cases: every hook case runs in
 * `@molecule/app-react` without errors or warnings, and the committed goldens
 * equal what React produces today.
 *
 * `RECORD_GOLDENS=1 npx vitest run` rewrites `src/bindings/goldens.json`.
 * Recording is the deliberate step that changes the contract: every framework
 * binding then has to match it.
 *
 * While writing cases: `CONFORMANCE_HOOKS=useAuth,useForm` narrows the run,
 * `CONFORMANCE_SKIP_GOLDENS=1` checks only that React runs them cleanly, and
 * `CONFORMANCE_DUMP=<file>` writes what React produced to that file.
 *
 * @module
 */

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as ReactBindings from '@molecule/app-react'

import {
  bindingCaseFamilies,
  type BindingGoldens,
  bindingGoldens,
  type HookCaseResult,
  requiredBindingExports,
  runHookCase,
} from '../bindings/index.js'
import { reactBindingAdapter } from './react-bindings-adapter.js'

const RECORD = process.env.RECORD_GOLDENS === '1'
const SKIP_GOLDENS = process.env.CONFORMANCE_SKIP_GOLDENS === '1'
// A path to write this run's React results to, for reading while writing cases (never the goldens file).
const DUMP = process.env.CONFORMANCE_DUMP || null
const FILTER =
  process.env.CONFORMANCE_HOOKS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean) ?? null
if (RECORD && FILTER) throw new Error('RECORD_GOLDENS records every hook; unset CONFORMANCE_HOOKS')
const families = bindingCaseFamilies.filter((f) => !FILTER || FILTER.includes(f.hook))
const here = dirname(fileURLToPath(import.meta.url))
const GOLDENS_FILE = join(here, '..', 'bindings', 'goldens.json')

const exportNames = requiredBindingExports(Object.keys(ReactBindings))
const recorded: BindingGoldens = { exports: exportNames, cases: {} }

describe.skipIf(FILTER !== null)('React binding coverage', () => {
  it.skipIf(RECORD || SKIP_GOLDENS)('the committed goldens list the required exports', () => {
    expect(bindingGoldens.exports).toEqual(exportNames)
  })
  it('every required export has a case family with cases', () => {
    const covered = new Set(
      bindingCaseFamilies.filter((f) => f.cases.length > 0).map((f) => f.hook),
    )
    expect(exportNames.filter((name) => !covered.has(name))).toEqual([])
  })
  it('each export has one case family', () => {
    const hooks = bindingCaseFamilies.map((f) => f.hook)
    expect(hooks.filter((hook, i) => hooks.indexOf(hook) !== i)).toEqual([])
  })
  it('every case family names a required export', () => {
    expect(bindingCaseFamilies.map((f) => f.hook).filter((h) => !exportNames.includes(h))).toEqual(
      [],
    )
  })
})

describe('React reference runs', () => {
  let errors: string[] = []
  beforeEach(() => {
    errors = []
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '))
    })
    vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '))
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  afterAll(() => {
    if (DUMP) writeFileSync(DUMP, `${JSON.stringify(recorded.cases, null, 1)}\n`)
    if (!RECORD) return
    writeFileSync(GOLDENS_FILE, `${JSON.stringify(recorded, null, 1)}\n`)
  })

  for (const family of families) {
    describe(family.hook, () => {
      it('has unique case names', () => {
        const names = family.cases.map((c) => c.name)
        expect(new Set(names).size).toBe(names.length)
      })
      for (const testCase of family.cases) {
        it(testCase.name, async () => {
          const result: HookCaseResult = await runHookCase(
            reactBindingAdapter,
            family.hook,
            testCase,
          )
          expect(errors, 'React logged errors or warnings').toEqual([])
          expect(result.snapshots.length).toBe((testCase.steps ?? []).length + 1)
          ;(recorded.cases[family.hook] ??= {})[testCase.name] = result
          if (!RECORD && !SKIP_GOLDENS) {
            expect(
              bindingGoldens.cases[family.hook]?.[testCase.name],
              'goldens are stale: run RECORD_GOLDENS=1 npx vitest run in packages/app/frameworks/conformance',
            ).toEqual(JSON.parse(JSON.stringify(result)))
          }
        })
      }
    })
  }
})

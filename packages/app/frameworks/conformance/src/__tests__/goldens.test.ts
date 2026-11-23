/**
 * The React reference: every UI case renders in `@molecule/app-ui-react`
 * without errors or warnings, every React UI component has cases, and the
 * committed goldens equal what React renders today.
 *
 * `RECORD_GOLDENS=1 npx vitest run` rewrites `src/ui/goldens.json` (and a local,
 * never-committed readable copy with real class names under
 * `node_modules/.cache/framework-conformance/`). Recording is the deliberate
 * step that changes the contract: every framework then has to match it.
 * `CONFORMANCE_GOLDENS_OUT=<file>` writes the recording there instead, to compare it
 * with the committed goldens before keeping it.
 *
 * While writing cases: `CONFORMANCE_COMPONENTS=Input,Select` narrows the run and
 * `CONFORMANCE_SKIP_GOLDENS=1` checks only that React renders them cleanly.
 *
 * @module
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import '../ui/setup.js'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as ReactUI from '@molecule/app-ui-react'

import { assertBuiltFromSource } from '../build-freshness.js'
import { watchConformanceEventLoop } from '../stall-watchdog-vitest.js'
import {
  assertNoLostStyleValues,
  caseExports,
  type CaseResult,
  uiCaseFamilies,
  type UIGoldens,
  uiGoldens,
  writePixelCapture,
} from '../ui/index.js'
import { reactAdapter } from './react-adapter.js'
import {
  assertCompleteRecording,
  assertKeepsChildStepGoldens,
  missingRecordings,
} from './recording.js'

// React is recorded here: a reference that stops yielding ends the run with its stack.
watchConformanceEventLoop()

const RECORD = process.env.RECORD_GOLDENS === '1'
/**
 * A file a recording writes instead of the committed `goldens.json`: a recording to compare before
 * keeping it (new cases recorded, to merge only what they add).
 */
const OUT = process.env.CONFORMANCE_GOLDENS_OUT || null
const SKIP_GOLDENS = process.env.CONFORMANCE_SKIP_GOLDENS === '1'
const FILTER =
  process.env.CONFORMANCE_COMPONENTS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean) ?? null
if (RECORD && FILTER)
  throw new Error('RECORD_GOLDENS records every component; unset CONFORMANCE_COMPONENTS')
if (RECORD && !OUT) assertKeepsChildStepGoldens(uiGoldens.cases, 'src/ui/goldens.json')
const families = uiCaseFamilies.filter((f) => !FILTER || FILTER.includes(f.component))
const here = dirname(fileURLToPath(import.meta.url))
// A recording reads React's UI kit from its dist/: refuse one older than its source.
assertBuiltFromSource(['@molecule/app-ui-react'], here)
const GOLDENS_FILE = join(here, '..', 'ui', 'goldens.json')
const READABLE_FILE = join(
  here,
  '..',
  '..',
  'node_modules',
  '.cache',
  'framework-conformance',
  'goldens.readable.json',
)

/**
 * React UI exports no case renders: `cn` is `@molecule/app-ui`'s class joiner,
 * re-exported unchanged. Every framework must still export it (the exports
 * check in `runUIConformance`).
 */
const UNRENDERED_EXPORTS = new Set(['cn'])

const exportNames = Object.keys(ReactUI).sort()
const recorded: UIGoldens = { exports: exportNames, cases: {} }
const recordedReadable: UIGoldens = { exports: exportNames, cases: {} }

describe.skipIf(FILTER !== null)('React UI component coverage', () => {
  it('every @molecule/app-ui-react export is rendered by some case (as the root, nested, or as a probe hook)', () => {
    const covered = new Set<string>()
    for (const family of uiCaseFamilies) {
      for (const testCase of family.cases)
        for (const name of caseExports(family.component, testCase)) covered.add(name)
    }
    expect(
      exportNames.filter((name) => !UNRENDERED_EXPORTS.has(name) && !covered.has(name)),
    ).toEqual([])
  })
  it.skipIf(RECORD || SKIP_GOLDENS)('the committed goldens list the React exports', () => {
    expect(uiGoldens.exports).toEqual(exportNames)
  })
  it('every case family names a React UI export', () => {
    expect(uiCaseFamilies.map((f) => f.component).filter((c) => !(c in ReactUI))).toEqual([])
  })
})

describe('React reference renders', () => {
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
    if (!RECORD) return
    assertCompleteRecording(
      missingRecordings(
        Object.fromEntries(families.map((f) => [f.component, f.cases.map((c) => c.name)])),
        recorded.cases,
      ),
      OUT ?? GOLDENS_FILE,
    )
    if (OUT) mkdirSync(dirname(OUT), { recursive: true })
    writeFileSync(OUT ?? GOLDENS_FILE, `${JSON.stringify(recorded, null, 1)}\n`)
    mkdirSync(dirname(READABLE_FILE), { recursive: true })
    writeFileSync(READABLE_FILE, JSON.stringify(recordedReadable))
  })

  for (const family of families) {
    describe(family.component, () => {
      it('has unique case names', () => {
        const names = family.cases.map((c) => c.name)
        expect(new Set(names).size).toBe(names.length)
      })
      for (const testCase of family.cases) {
        it(testCase.name, async () => {
          const result = await reactAdapter.run(family.component, testCase)
          if (result.pages) {
            writePixelCapture('react', {
              reference: '@molecule/app-ui-react',
              component: family.component,
              case: testCase.name,
              pages: result.pages,
            })
          }
          expect(errors, 'React logged errors or warnings').toEqual([])
          expect(result.snapshots.length).toBe((testCase.interactions ?? []).length + 1)
          assertNoLostStyleValues(result.snapshots, `${family.component} / ${testCase.name}`)
          const golden: CaseResult = { snapshots: result.snapshots, calls: result.calls }
          ;(recorded.cases[family.component] ??= {})[testCase.name] = golden
          ;(recordedReadable.cases[family.component] ??= {})[testCase.name] = {
            snapshots: result.readable ?? [],
            calls: result.calls,
          }
          if (!RECORD && !SKIP_GOLDENS) {
            expect(
              uiGoldens.cases[family.component]?.[testCase.name],
              'goldens are stale: run RECORD_GOLDENS=1 npx vitest run in packages/app/frameworks/conformance',
            ).toEqual(golden)
          }
        })
      }
    })
  }
})

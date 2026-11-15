/**
 * The React reference for feature packages: every feature case renders in its
 * React package without errors or warnings, every runtime export is covered
 * (rendered by a case, compared by value, or named as framework-shaped), and
 * the committed goldens equal what React renders today.
 *
 * `RECORD_GOLDENS=1 npx vitest run src/__tests__/features-goldens.test.ts`
 * rewrites each feature's `src/features/goldens/<feature>.json` (and a local,
 * never-committed readable copy with real class names). Recording changes the
 * contract: every framework's counterpart then has to match it.
 *
 * `CONFORMANCE_FEATURE=@molecule/app-tag-input-react[,…]` runs (and records)
 * only those packages: it loads only their cases files and writes only their
 * goldens files, so ports of different features can record side by side.
 *
 * @module
 */

import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import '../ui/setup.js'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as ReactBindings from '@molecule/app-react'
import * as ReactUI from '@molecule/app-ui-react'

import { type HookCaseResult, runHookCase } from '../bindings/index.js'
import { featureCaseFileNames, loadFeatureCases } from '../features/all.js'
import {
  FEATURE_GOLDENS_DIR,
  featureAppComposition,
  type FeatureCases,
  featureCaseSet,
  featureCasesName,
  type FeatureGoldens,
  featureGoldensFile,
  featureReadableGoldensFile,
  featureValue,
  loadFeatureGoldens,
  sharedExportProblems,
} from '../features/index.js'
import { caseExports, type CaseResult, onlyFromEnv, writePixelCapture } from '../ui/index.js'
import { createReactAdapter } from './react-adapter.js'
import { createReactBindingAdapter } from './react-bindings-adapter.js'
import { assertCompleteRecording, missingRecordings } from './recording.js'

const RECORD = process.env.RECORD_GOLDENS === '1'
/** The React packages this run is narrowed to, or null for every feature. */
const ONLY = onlyFromEnv('CONFORMANCE_FEATURE')

/** The cases of each React feature package this run covers, by package. */
const featureCases: Record<string, FeatureCases> = Object.fromEntries(
  (
    await Promise.all(
      (ONLY ?? featureCaseFileNames()).map((name) =>
        loadFeatureCases(ONLY ? featureCasesName(name) : name),
      ),
    )
  )
    .sort((a, b) => a.package.localeCompare(b.package))
    .map((feature) => [feature.package, featureCaseSet(feature)]),
)

/** Each React feature package, by name. */
const MODULES: Record<string, Record<string, unknown>> = Object.fromEntries(
  await Promise.all(Object.keys(featureCases).map(async (name) => [name, await import(name)])),
)

/** The framework-neutral packages feature packages re-export from (each feature's `shared` field). */
const SHARED_MODULES: Record<string, Record<string, unknown>> = Object.fromEntries(
  await Promise.all(
    [...new Set(Object.values(featureCases).flatMap((f) => Object.values(f.shared ?? {})))].map(
      async (name) => [name, await import(name)],
    ),
  ),
)

const recorded: Record<string, FeatureGoldens> = {}
const recordedReadable: Record<string, FeatureGoldens> = {}
const stale = (name: string) =>
  `goldens are stale: run CONFORMANCE_FEATURE=${name} RECORD_GOLDENS=1 npx vitest run src/__tests__/features-goldens.test.ts in packages/app/frameworks/conformance`

describe.skipIf(ONLY !== null)('feature goldens files', () => {
  const goldenNames = () =>
    readdirSync(FEATURE_GOLDENS_DIR)
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.slice(0, -'.json'.length))
  it('every goldens file has a cases file', () => {
    const cases = featureCaseFileNames()
    expect(goldenNames().filter((name) => !cases.includes(name))).toEqual([])
  })
  it.skipIf(RECORD)('every cases file has a goldens file', () => {
    const goldens = goldenNames()
    expect(featureCaseFileNames().filter((name) => !goldens.includes(name))).toEqual([])
  })
})

for (const [name, module] of Object.entries(MODULES)) {
  const feature = featureCases[name]!
  const goldens = RECORD ? null : loadFeatureGoldens(name)
  const exportNames = Object.keys(module).sort()
  const adapter = createReactAdapter({
    ...(ReactUI as unknown as Record<string, unknown>),
    ...module,
  })
  // The package's hook cases run like the binding kit's own: the binding plus the package.
  const bindingAdapter = createReactBindingAdapter({
    ...(ReactBindings as unknown as Record<string, unknown>),
    ...module,
  })
  recorded[name] = { exports: exportNames, values: {}, cases: {} }
  recordedReadable[name] = { exports: exportNames, values: {}, cases: {} }

  describe(name, () => {
    it('every runtime export is rendered, compared by value, or framework-shaped', () => {
      const covered = new Set<string>([
        ...(feature.values ?? []).map((v) => v.export),
        ...Object.keys(feature.frameworkShaped ?? {}),
        ...Object.keys(feature.shared ?? {}),
        ...(feature.hooks ?? []).filter((f) => f.cases.length > 0).map((f) => f.hook),
      ])
      for (const family of feature.families)
        for (const testCase of family.cases)
          for (const used of caseExports(family.component, testCase)) covered.add(used)
      expect(exportNames.filter((e) => !covered.has(e))).toEqual([])
      expect([...covered].filter((e) => !exportNames.includes(e) && !(e in ReactUI))).toEqual([])
    })

    it('re-exports each shared export from its framework-neutral package', () => {
      expect(sharedExportProblems(feature.shared ?? {}, module, SHARED_MODULES)).toEqual([])
    })

    it.skipIf(RECORD)('the committed goldens list the React exports', () => {
      expect(goldens?.exports, stale(name)).toEqual(exportNames)
    })

    for (const check of feature.values ?? []) {
      it(`value: ${check.export}`, () => {
        const value = featureValue(check, module[check.export])
        recorded[name]!.values[check.export] = value
        recordedReadable[name]!.values[check.export] = value
        if (!RECORD) expect(goldens?.values[check.export], stale(name)).toEqual(value)
      })
    }

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

    for (const family of feature.hooks ?? []) {
      describe(`hook ${family.hook}`, () => {
        it('has unique case names', () => {
          const names = family.cases.map((c) => c.name)
          expect(new Set(names).size).toBe(names.length)
        })
        for (const testCase of family.cases) {
          it(testCase.name, async () => {
            const result: HookCaseResult = await runHookCase(
              bindingAdapter,
              family.hook,
              testCase,
              undefined,
              family,
            )
            expect(errors, 'React logged errors or warnings').toEqual([])
            expect(result.snapshots.length).toBe((testCase.steps ?? []).length + 1)
            const golden = JSON.parse(JSON.stringify(result)) as HookCaseResult
            ;((recorded[name]!.hooks ??= {})[family.hook] ??= {})[testCase.name] = golden
            ;((recordedReadable[name]!.hooks ??= {})[family.hook] ??= {})[testCase.name] = golden
            if (!RECORD) {
              expect(goldens?.hooks?.[family.hook]?.[testCase.name], stale(name)).toEqual(golden)
            }
          })
        }
      })
    }

    for (const family of feature.families) {
      describe(family.component, () => {
        it('has unique case names', () => {
          const names = family.cases.map((c) => c.name)
          expect(new Set(names).size).toBe(names.length)
        })
        for (const testCase of family.cases) {
          it(testCase.name, async () => {
            const result = await adapter.run(
              family.component,
              testCase,
              feature.composition === 'app' ? { app: featureAppComposition } : undefined,
            )
            if (result.pages) {
              writePixelCapture('react', {
                reference: name,
                component: family.component,
                case: testCase.name,
                pages: result.pages,
              })
            }
            expect(errors, 'React logged errors or warnings').toEqual([])
            expect(result.snapshots.length).toBe((testCase.interactions ?? []).length + 1)
            const golden: CaseResult = { snapshots: result.snapshots, calls: result.calls }
            ;(recorded[name]!.cases[family.component] ??= {})[testCase.name] = golden
            ;(recordedReadable[name]!.cases[family.component] ??= {})[testCase.name] = {
              snapshots: result.readable ?? [],
              calls: result.calls,
            }
            if (!RECORD) {
              expect(goldens?.cases[family.component]?.[testCase.name], stale(name)).toEqual(golden)
            }
          })
        }
      })
    }
  })
}

afterAll(() => {
  if (!RECORD) return
  // Every feature is checked before any file is written, so an incomplete run writes nothing.
  for (const [name, feature] of Object.entries(featureCases)) {
    const expected: Record<string, string[]> = {}
    const got: Record<string, Record<string, unknown> | undefined> = {}
    expected.values = (feature.values ?? []).map((v) => v.export)
    got.values = recorded[name]?.values
    for (const family of feature.families) {
      expected[family.component] = family.cases.map((c) => c.name)
      got[family.component] = recorded[name]?.cases[family.component]
    }
    for (const family of feature.hooks ?? []) {
      expected[`hook ${family.hook}`] = family.cases.map((c) => c.name)
      got[`hook ${family.hook}`] = recorded[name]?.hooks?.[family.hook]
    }
    assertCompleteRecording(missingRecordings(expected, got), featureGoldensFile(name))
  }
  for (const name of Object.keys(featureCases)) {
    // A package without hook cases records no `hooks` key.
    for (const golden of [recorded[name]!, recordedReadable[name]!])
      if (golden.hooks && Object.keys(golden.hooks).length === 0) delete golden.hooks
    writeFileSync(featureGoldensFile(name), `${JSON.stringify(recorded[name], null, 1)}\n`)
    const readable = featureReadableGoldensFile(name)
    mkdirSync(dirname(readable), { recursive: true })
    writeFileSync(readable, JSON.stringify(recordedReadable[name]))
  }
})
